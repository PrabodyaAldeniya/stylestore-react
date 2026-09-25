// ========================================
// StyleStore checkout + order history API.
// POST /api/orders — creates an order inside a MySQL
// transaction. All pricing is computed server-side from
// the trusted backend catalog; client-supplied prices and
// discount amounts are ignored.
// GET  /api/orders/:orderNumber — safe order summary for
// the confirmation page (after a refresh).
// POST /api/orders/history — returns the orders matching
// the order numbers the browser stored in localStorage.
// POST /api/orders/lookup — returns one order only when
// the order number AND the checkout email both match.
// POST /api/orders/discount-code — validates a discount
// code and returns its percentage.
//
// Writes into the ORIGINAL XAMPP tables (orders,
// order_items) and the discount_codes table that the
// schema initializer creates.
// ========================================
import crypto from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import pool from "../db.js";
import { getProduct } from "../data/products.js";
import { sendOrderEmail } from "../lib/orderMailer.js";

const router = Router();

// Maximum number of order numbers accepted in one history request.
const MAX_HISTORY_ORDERS = 50;

// ---- Business rules (single source of truth on the server) ----
const DELIVERY_METHODS = {
  standard: { label: "Standard Delivery", fee: 650 },
  express: { label: "Express Delivery (1-2 days)", fee: 1900 },
};
const PAYMENT_METHODS = {
  cod: "Cash on Delivery",
  bank_deposit: "Bank Deposit",
};
// The original orders table stores payment methods as
// enum('cash_on_delivery','bank_deposit'), so translate the
// internal ids used by the frontend to the stored values.
const PAYMENT_TO_DB = {
  cod: "cash_on_delivery",
  bank_deposit: "bank_deposit",
};
const PAYMENT_FROM_DB = {
  cash_on_delivery: "cod",
  bank_deposit: "bank_deposit",
};
const FREE_DELIVERY_THRESHOLD = 10000;
const MAX_ITEMS = 50;
const MAX_ITEM_QTY = 99;
const MAX_DISCOUNT_PERCENT = 50; // hard safety ceiling, applied server-side

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}' -]{2,80}$/u;
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,19}$/;
const DISTRICT_PATTERN = /^[\p{L}\p{M}' .-]{2,100}$/u;
const CITY_PATTERN = /^[\p{L}\p{M}' .-]{2,100}$/u;
const ADDRESS_PATTERN = /^[\p{L}\p{M}0-9' .#,/-]{5,255}$/u;
const CODE_PATTERN = /^[A-Z0-9]{3,30}$/;

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many order attempts. Please try again later.",
  },
});

const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many discount checks. Please try again later.",
  },
});

const historyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many order history requests. Please try again later.",
  },
});

// ---- Validation helpers ----
function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateField(value, pattern, { required = true, max } = {}) {
  if (!value) return required ? "missing" : null;
  if (max && value.length > max) return "too-long";
  if (pattern && !pattern.test(value)) return "invalid";
  return null;
}

function maskEmail(email) {
  const at = email.indexOf("@");
  if (at <= 1) return "***@***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

// Accept a raw order number list from the browser, normalise it (trim +
// uppercase), drop duplicates and return the clean array. Anything that is
// not a valid StyleStore order number rejects the whole request, and the
// callers cap the total length separately.
function sanitizeOrderNumbers(raw) {
  if (!Array.isArray(raw)) return null;
  const result = [];
  const seen = new Set();
  for (const value of raw) {
    const orderNumber = str(value).toUpperCase();
    if (!/^SS-\d{8}-[A-Z0-9]{5}$/.test(orderNumber)) return null;
    if (seen.has(orderNumber)) continue;
    seen.add(orderNumber);
    result.push(orderNumber);
  }
  return result;
}

// Build the safe, frontend-facing order object from an `orders` row and its
// matching `order_items` rows. Personal data (email, name, address, phone)
// is intentionally NOT included — history/lookup responses only carry what
// the order cards need.
function buildOrderFromRows(orderRow, itemRows) {
  const paymentMethod = PAYMENT_FROM_DB[orderRow.payment_method] || orderRow.payment_method;
  return {
    orderNumber: orderRow.order_number,
    deliveryMethod: orderRow.delivery_method,
    deliveryLabel: DELIVERY_METHODS[orderRow.delivery_method]?.label || orderRow.delivery_method,
    paymentMethod,
    paymentLabel: PAYMENT_METHODS[paymentMethod] || orderRow.payment_method,
    subtotal: Number(orderRow.subtotal),
    discount: Number(orderRow.discount),
    discountCode: orderRow.discount_code || null,
    shipping: Number(orderRow.shipping_fee),
    total: Number(orderRow.total),
    status: orderRow.status,
    createdAt: orderRow.created_at,
    items: itemRows.map((item) => {
      const unitPrice = Number(item.unit_price);
      const quantity = Number(item.quantity);
      return {
        productId: String(item.product_id),
        productName: item.product_name,
        size: item.size,
        color: item.color,
        quantity,
        unitPrice,
        lineTotal: Math.round(unitPrice * quantity),
      };
    }),
  };
}

// Unique, human-readable order number: SS-YYYYMMDD-XXXXX
function generateOrderNumber(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const random = crypto.randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `SS-${yyyy}${mm}${dd}-${random}`;
}

// Server-side totals — the ONLY totals the order trusts.
function computeTotals({ items, discountPercent, deliveryMethod }) {
  let subtotal = 0;
  const lines = [];
  let quantityCount = 0;

  for (const item of items) {
    const product = getProduct(item.id);
    if (!product) return null; // unknown product -> reject whole order
    const price = Math.round(Number(product.price));
    const qty = Math.round(Number(item.quantity));
    if (!Number.isFinite(price) || price < 0) return null;
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_ITEM_QTY) return null;

    quantityCount += qty;
    if (quantityCount > 500) return null;

    const lineTotal = price * qty;
    subtotal += lineTotal;
    lines.push({
      productId: product.id,
      productName: product.name,
      size: item.size || null,
      color: item.color || null,
      quantity: qty,
      unitPrice: price,
      lineTotal,
    });
  }

  const discountRate = Math.min(
    Number(discountPercent) || 0,
    MAX_DISCOUNT_PERCENT
  );
  const discount = discountRate > 0 ? Math.round((subtotal * discountRate) / 100) : 0;
  const afterDiscount = subtotal - discount;
  const shipping =
    afterDiscount >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_METHODS[deliveryMethod].fee;
  const total = afterDiscount + shipping;

  return { lines, subtotal, discount, shipping, total, quantityCount };
}

router.post("/orders/discount-code", codeLimiter, async (req, res) => {
  const raw = str(req.body?.code);
  const code = raw.toUpperCase();

  if (!CODE_PATTERN.test(code)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_CODE",
      message: "Please enter a valid discount code.",
    });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT code, percent_off FROM discount_codes WHERE code = ? AND active = 1 LIMIT 1",
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "CODE_NOT_FOUND",
        message: "That discount code isn't valid or has expired.",
      });
    }
    const percent = Math.min(Number(rows[0].percent_off) || 0, MAX_DISCOUNT_PERCENT);
    return res.status(200).json({
      success: true,
      code: rows[0].code,
      percentOff: percent,
    });
  } catch (error) {
    console.error("[orders] discount-code lookup failed:", error?.message ?? "unknown");
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "The checkout service is temporarily unavailable. Please try again shortly.",
    });
  }
});

router.post("/orders", orderLimiter, async (req, res) => {
  const body = req.body ?? {};

  // 1. Normalise + validate customer fields.
  const email = str(body.email).toLowerCase();
  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  const phone = str(body.phone);
  const country = str(body.country) || "Sri Lanka";
  const addressLine1 = str(body.addressLine1);
  const city = str(body.city);
  const district = str(body.district);
  const postalCode = str(body.postalCode || "");

  const fieldErrors = {};
  if (validateField(email, EMAIL_PATTERN, { max: 254 })) fieldErrors.email = "Enter a valid email address.";
  if (validateField(firstName, NAME_PATTERN)) fieldErrors.firstName = "Enter your first name.";
  if (validateField(lastName, NAME_PATTERN)) fieldErrors.lastName = "Enter your last name.";
  if (validateField(phone, PHONE_PATTERN, { max: 20 })) fieldErrors.phone = "Enter a valid phone number.";
  if (validateField(country, null, { required: false, max: 60 })) fieldErrors.country = "Invalid country.";
  if (validateField(addressLine1, ADDRESS_PATTERN, { max: 255 })) fieldErrors.addressLine1 = "Enter your delivery address.";
  if (validateField(city, CITY_PATTERN, { max: 100 })) fieldErrors.city = "Enter your city.";
  if (validateField(district, DISTRICT_PATTERN, { max: 100 })) fieldErrors.district = "Enter your district.";
  if (postalCode && validateField(postalCode, /^[A-Za-z0-9 -]{2,20}$/, { required: false, max: 20 })) {
    fieldErrors.postalCode = "Postal code looks invalid.";
  }

  // The marketing address book (subscribers) is separate and only filled
  // via the newsletter, so no marketing flag is persisted with the order.

  // 2. Delivery + payment methods (whitelist).
  const deliveryMethod = str(body.deliveryMethod);
  const paymentMethod = str(body.paymentMethod);
  if (!DELIVERY_METHODS[deliveryMethod]) fieldErrors.deliveryMethod = "Choose a delivery method.";
  if (!PAYMENT_METHODS[paymentMethod]) fieldErrors.paymentMethod = "Choose a payment method.";

  // 3. Cart items (ids + quantities only — never prices).
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) fieldErrors.items = "Your cart is empty.";
  else if (items.length > MAX_ITEMS) fieldErrors.items = "Too many items in the cart.";

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
      fields: fieldErrors,
    });
  }

  // 4. Resolve discount from the database only.
  let discountPercent = 0;
  let discountCode = null;
  const rawCode = str(body.discountCode).toUpperCase();
  if (rawCode) {
    if (!CODE_PATTERN.test(rawCode)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CODE",
        message: "Please enter a valid discount code.",
      });
    }
    try {
      const [rows] = await pool.execute(
        "SELECT code, percent_off FROM discount_codes WHERE code = ? AND active = 1 LIMIT 1",
        [rawCode]
      );
      if (rows.length > 0) {
        discountCode = rows[0].code;
        discountPercent = Math.min(Number(rows[0].percent_off) || 0, MAX_DISCOUNT_PERCENT);
      } else {
        return res.status(400).json({
          success: false,
          code: "INVALID_CODE",
          message: "That discount code isn't valid or has expired.",
        });
      }
    } catch (error) {
      console.error("[orders] discount lookup failed:", error?.message ?? "unknown");
      return res.status(503).json({
        success: false,
        code: "DB_UNAVAILABLE",
        message: "The checkout service is temporarily unavailable. Please try again shortly.",
      });
    }
  }

  // 5. Server-side totals.
  const totals = computeTotals({ items, discountPercent, deliveryMethod });
  if (!totals) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ITEMS",
      message: "One or more items in your cart are no longer available. Please refresh and try again.",
    });
  }

  // 6. Store the order + items inside one transaction.
  const connection = await pool.getConnection();
  let orderId;
  let orderNumber;

  try {
    await connection.beginTransaction();

    // Generating the order number here means a unique-key collision can
    // only happen on a race; retry a few times inside the transaction.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateOrderNumber();
      try {
        const [orderResult] = await connection.execute(
          `INSERT INTO orders
             (order_number, email, first_name, last_name, phone, address, city,
              district, postal_code, country, delivery_method, payment_method,
              subtotal, discount, shipping_fee, total, discount_code, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed')`,
          [
            candidate,
            email,
            firstName,
            lastName,
            phone,
            addressLine1,
            city,
            district,
            postalCode || null,
            country,
            deliveryMethod,
            PAYMENT_TO_DB[paymentMethod],
            totals.subtotal,
            totals.discount,
            totals.shipping,
            totals.total,
            discountCode,
          ]
        );
        orderId = orderResult.insertId;
        orderNumber = candidate;
        break;
      } catch (error) {
        if (error?.code !== "ER_DUP_ENTRY") throw error;
        if (attempt === 4) throw error;
      }
    }

    if (!orderId) {
      throw new Error("Could not allocate a unique order number.");
    }

    for (const line of totals.lines) {
      await connection.execute(
        `INSERT INTO order_items
           (order_id, product_id, product_name, size, color, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          String(line.productId),
          line.productName,
          line.size,
          line.color,
          line.quantity,
          line.unitPrice,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("[orders] transaction failed:", error?.message ?? "unknown");
    return res.status(500).json({
      success: false,
      code: "ORDER_SAVE_FAILED",
      message: "We couldn't save your order right now. Please try again.",
    });
  } finally {
    connection.release();
  }

  // ---- Order is safely saved. Now: best-effort confirmation email. ----
  const safeSummary = {
    orderNumber,
    subtotal: totals.subtotal,
    discount: totals.discount,
    discountCode,
    shipping: totals.shipping,
    total: totals.total,
    deliveryMethod,
    deliveryLabel: DELIVERY_METHODS[deliveryMethod].label,
    paymentMethod,
    paymentLabel: PAYMENT_METHODS[paymentMethod],
    itemCount: totals.quantityCount,
  };

  try {
    await sendOrderEmail(email, {
      firstName,
      ...safeSummary,
      items: totals.lines,
    });
    console.info(`[orders] confirmation email accepted for ${maskEmail(email)} (${orderNumber})`);
  } catch (error) {
    const code = error?.code ?? "INTERNAL_ERROR";
    console.error(`[orders] confirmation email failed (${code}) for ${maskEmail(email)} (${orderNumber}) — order still saved`);
  }

  return res.status(201).json({ success: true, order: safeSummary });
});

router.get("/orders/:orderNumber", async (req, res) => {
  const orderNumber = str(req.params.orderNumber).toUpperCase();
  if (!/^SS-\d{8}-[A-Z0-9]{5}$/.test(orderNumber)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ORDER_NUMBER",
      message: "Invalid order number.",
    });
  }

  try {
    const [orderRows] = await pool.execute(
      `SELECT order_number, delivery_method, payment_method, subtotal,
              discount, shipping_fee, total, discount_code, status, created_at,
              first_name, email
         FROM orders WHERE order_number = ? LIMIT 1`,
      [orderNumber]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "We couldn't find that order.",
      });
    }

    const [itemRows] = await pool.execute(
      `SELECT product_id, product_name, size, color, quantity, unit_price
         FROM order_items WHERE order_id = (
           SELECT id FROM orders WHERE order_number = ? LIMIT 1
         )`,
      [orderNumber]
    );

    const order = buildOrderFromRows(orderRows[0], itemRows);
    return res.status(200).json({
      success: true,
      order: {
        ...order,
        firstName: orderRows[0].first_name,
        email: orderRows[0].email,
      },
    });
  } catch (error) {
    console.error("[orders] lookup failed:", error?.message ?? "unknown");
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "The checkout service is temporarily unavailable. Please try again shortly.",
    });
  }
});

router.post("/orders/history", historyLimiter, async (req, res) => {
  // Browser-supplied order numbers only. Each is validated, so the query can
  // never contain arbitrary SQL or reveal orders the browser did not ask for.
  const orderNumbers = sanitizeOrderNumbers(req.body?.orderNumbers);
  if (!orderNumbers) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ORDER_NUMBERS",
      message: "Please provide a valid list of order numbers.",
    });
  }
  if (orderNumbers.length > MAX_HISTORY_ORDERS) {
    return res.status(400).json({
      success: false,
      code: "TOO_MANY_ORDERS",
      message: "Too many order numbers in one request.",
    });
  }
  if (orderNumbers.length === 0) {
    return res.status(200).json({ success: true, orders: [] });
  }

  try {
    // Parameterised `IN (...)` so no raw values ever reach the SQL string.
    const orderPlaceholders = orderNumbers.map(() => "?").join(", ");
    const [orderRows] = await pool.execute(
      `SELECT id, order_number, delivery_method, payment_method, subtotal,
              discount, shipping_fee, total, discount_code, status, created_at
         FROM orders WHERE order_number IN (${orderPlaceholders})
         ORDER BY created_at DESC, id DESC`,
      orderNumbers
    );

    let orders = [];
    if (orderRows.length > 0) {
      const ids = orderRows.map((row) => row.id);
      const idPlaceholders = ids.map(() => "?").join(", ");
      const [itemRows] = await pool.execute(
        `SELECT order_id, product_id, product_name, size, color, quantity, unit_price
           FROM order_items WHERE order_id IN (${idPlaceholders})`,
        ids
      );

      const itemsByOrder = new Map();
      for (const item of itemRows) {
        const list = itemsByOrder.get(item.order_id) || [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }

      orders = orderRows.map((row) => buildOrderFromRows(row, itemsByOrder.get(row.id) || []));
    }

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("[orders] history lookup failed:", error?.message ?? "unknown");
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "The order history service is temporarily unavailable. Please try again shortly.",
    });
  }
});

router.post("/orders/lookup", historyLimiter, async (req, res) => {
  // A new-device lookup needs BOTH the order number and the exact checkout
  // email. An email alone can never reveal somebody else's order.
  const orderNumber = str(req.body?.orderNumber).toUpperCase();
  const email = str(req.body?.email).toLowerCase();

  if (!/^SS-\d{8}-[A-Z0-9]{5}$/.test(orderNumber)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ORDER_NUMBER",
      message: "Please enter a valid order number.",
    });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "Please enter the email address used at checkout.",
    });
  }

  try {
    const [orderRows] = await pool.execute(
      `SELECT id, order_number, delivery_method, payment_method, subtotal,
              discount, shipping_fee, total, discount_code, status, created_at
         FROM orders WHERE order_number = ? AND email = ? LIMIT 1`,
      [orderNumber, email]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "We couldn't find an order matching that order number and email.",
      });
    }

    const [itemRows] = await pool.execute(
      `SELECT product_id, product_name, size, color, quantity, unit_price
         FROM order_items WHERE order_id = ?`,
      [orderRows[0].id]
    );

    return res.status(200).json({
      success: true,
      order: buildOrderFromRows(orderRows[0], itemRows),
    });
  } catch (error) {
    console.error("[orders] lookup by email failed:", error?.message ?? "unknown");
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "The order look-up service is temporarily unavailable. Please try again shortly.",
    });
  }
});

export default router;
