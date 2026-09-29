// ========================================
// PUBLIC REVIEW API
// --------------------------------------------------------
// Mounted at /api, so the customer-facing endpoints are:
//
//   POST /api/reviews/verify  — check an order number + email and
//                               list what can be reviewed
//   POST /api/reviews        — submit a review (auto-published once
//                               every check below passes)
//   GET  /api/reviews        — published (approved) reviews only
//
// Safety rules for this file:
//   * every SQL statement is parameterised and lives in
//     repositories/reviews.js
//   * a review can only be written for a product on an order line
//     of a DELIVERED order the customer proved they own
//   * the server resolves which order line is being reviewed, so
//     the browser never sees or sends an order-item id
//   * "Verified Buyer" is set by the server after that proof, never
//     by the browser
//   * the status is always set to 'approved' by the server after
//     the order number, email, delivered status, order line,
//     duplicate, rating and text checks pass
//   * responses never contain the email address, the order number
//     or any internal id
//   * database errors are logged server-side and answered with a
//     generic message
// ========================================
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import pool from "../db.js";
import {
  createReview,
  findOrderForReview,
  findReviewForOrderItem,
  findUnreviewedOrderItemForReview,
  getPublicReviewById,
  isOrderDelivered,
  listApprovedReviews,
  listOrderReviewableProducts,
  syncProductRating,
} from "../repositories/reviews.js";
import { findSpamReason, reviewError, validateReviewSubmission } from "../validation/review.js";

const router = Router();

/** Rate limits are generous for an honest customer and hostile to a script.
 *  They are env-tunable (REVIEW_SUBMIT_LIMIT / REVIEW_VERIFY_LIMIT) so a
 *  deployment can loosen them for a launch and a verification run can raise
 *  them without editing code. */
function envLimit(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// Generous enough for an honest customer retrying after a typo, tight enough
// that a script cannot flood the queue with pending reviews.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: envLimit("REVIEW_SUBMIT_LIMIT", 12),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many review attempts. Please try again in a few minutes.",
  },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: envLimit("REVIEW_VERIFY_LIMIT", 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many order checks. Please try again in a few minutes.",
  },
});

const readLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

// The generic answer for every failed purchase check. A wrong email and an
// unknown order number give the identical reply, so this endpoint cannot be
// used to discover which order numbers exist.
const ORDER_MISMATCH_MESSAGE =
  "We couldn't find an order matching that order number and email. Please check both and try again.";

// Shown only after the customer has already proven the order is theirs, so it
// reveals nothing to anyone else — it just tells a real shopper why the
// review buttons are not active yet.
const ORDER_NOT_DELIVERED_MESSAGE =
  "Reviews open once your order has been delivered. We'll email you when it arrives.";

const ALL_ITEMS_REVIEWED_MESSAGE =
  "You've already reviewed everything in this order. Thank you!";

function sendDatabaseError(res, logContext, error) {
  console.error(`[reviews] ${logContext}:`, error?.message ?? "unknown");
  return res.status(503).json({
    success: false,
    code: "DB_UNAVAILABLE",
    message: "The review service is temporarily unavailable. Please try again shortly.",
  });
}

// ========================================================
// 1. VERIFY AN ORDER  →  POST /api/reviews/verify
// --------------------------------------------------------
// Step 1 of the form: the customer types their order number and
// checkout email, and gets back the products in that order.
// No product can be offered here that is not genuinely theirs, and
// nothing can be offered until the order has been delivered.
//
// The response tells the client whether reviews are open yet, and
// which lines are still reviewable, but it never exposes an order id
// or an order-item id — the browser only ever works with product ids.
// ========================================================
router.post("/reviews/verify", verifyLimiter, async (req, res) => {
  // Honeypot: acknowledge quietly, store nothing, claim nothing.
  if (findSpamReason(req.body ?? {}) === "honeypot") {
    return res.status(200).json({ success: true, message: "Request acknowledged." });
  }

  let parsed;
  try {
    parsed = validateOrderLookup(req.body);
  } catch (error) {
    return res.status(error.status || 422).json({
      success: false,
      code: error.code || "VALIDATION_ERROR",
      message: "Please check the order number and email.",
      ...(error.fields ? { fields: error.fields } : {}),
    });
  }

  try {
    const order = await findOrderForReview(parsed.orderNumber, parsed.email);
    if (!order) {
      return res.status(404).json({
        success: false,
        code: "ORDER_NOT_FOUND",
        message: ORDER_MISMATCH_MESSAGE,
      });
    }

    const delivered = isOrderDelivered(order);
    // The item list is fetched either way so the customer can see what is on
    // the way, but `reviewable` is false on every line until it is delivered.
    const products = await listOrderReviewableProducts(order.id);
    const items = products.map((product) => ({
      ...product,
      reviewable: delivered && !product.alreadyReviewed,
    }));

    return res.status(200).json({
      success: true,
      // The order number is echoed back because the customer just typed it —
      // it is their own number, not someone else's, and it is never stored in
      // the browser or shown to other visitors.
      orderNumber: order.order_number,
      orderPlacedAt: order.created_at,
      // Safe to show: this is the customer's own order status, and it has
      // already been proven with the checkout email.
      orderStatus: order.status,
      delivered,
      products: items,
      reviewableCount: items.filter((product) => product.reviewable).length,
      // The form uses this to explain the empty state instead of showing a
      // bare "nothing to review" with no reason.
      message: !delivered
        ? ORDER_NOT_DELIVERED_MESSAGE
        : items.some((product) => product.reviewable)
          ? undefined
          : ALL_ITEMS_REVIEWED_MESSAGE,
    });
  } catch (error) {
    return sendDatabaseError(res, "order verification failed", error);
  }
});

/** Format-only check for the lookup step; the real check is the SQL lookup. */
function validateOrderLookup(body = {}) {
  const orderNumber = text(body.orderNumber).toUpperCase();
  const email = text(body.email).toLowerCase();
  if (!/^SS-\d{8}-[A-Z0-9]{5}$/.test(orderNumber)) {
    throw reviewError("Enter a valid order number.", "VALIDATION_ERROR", 422, {
      orderNumber: "Enter a valid order number, e.g. SS-20250101-AB12C.",
    });
  }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw reviewError("Enter a valid email.", "VALIDATION_ERROR", 422, {
      email: "Enter the email address you used at checkout.",
    });
  }
  return { orderNumber, email };
}

// ========================================================
// 2. SUBMIT A REVIEW  →  POST /api/reviews
// --------------------------------------------------------
// Step 2: the order is verified again from scratch (never trust
// the earlier step), the order must be DELIVERED, the server
// resolves which unreviewed order line this product refers to, a
// duplicate is refused, and only then is the row written as
// 'approved' with source = 'customer' and verified_buyer = 1. In
// the same transaction the product's rating is recalculated from
// its approved CUSTOMER reviews, so the public number is correct
// the moment the response leaves the server.
// ========================================================
router.post("/reviews", submitLimiter, async (req, res) => {
  const body = req.body ?? {};

  // Honeypot + cheap spam heuristics before any database work. A bot that
  // filled the hidden field gets the same happy answer as a person, but
  // nothing is written to the database.
  const spam = findSpamReason(body);
  if (spam === "honeypot") {
    return res.status(200).json({
      success: true,
      message: "Thank you! Your review has been published.",
    });
  }
  if (spam) {
    return res.status(422).json({
      success: false,
      code: "REVIEW_REJECTED",
      message: "We couldn't accept that review. Please write about the product in your own words.",
      fields: { reviewText: "Please remove any links or phone numbers from your review." },
    });
  }

  // 1. Validate every field (rating must be an integer 1–5, lengths capped).
  //    validateReviewSubmission also guarantees productId is a positive
  //    integer, so it can be used as a query value as-is.
  let data;
  try {
    data = validateReviewSubmission(body);
  } catch (error) {
    return res.status(error.status || 422).json({
      success: false,
      code: error.code || "VALIDATION_ERROR",
      message: error.message || "Please check the review form.",
      ...(error.fields ? { fields: error.fields } : {}),
    });
  }
  const productId = data.productId;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 2. Prove the purchase: order number AND checkout email must match one
    //    order. Either one alone is never enough.
    const order = await findOrderForReview(data.orderNumber, data.email, connection);
    if (!order) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        code: "ORDER_NOT_FOUND",
        message: ORDER_MISMATCH_MESSAGE,
      });
    }

    // 3. The order must be DELIVERED. This is checked here, not only in the
    //    form, so the endpoint cannot be posted to directly for an order that
    //    is still in transit.
    if (!isOrderDelivered(order)) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        code: "ORDER_NOT_DELIVERED",
        message: ORDER_NOT_DELIVERED_MESSAGE,
      });
    }

    // 4. Resolve the exact order line server-side and confirm it has no
    //    review yet. The browser only sent a product id, so it cannot ask
    //    for a line that is not in this order, and cannot ask twice.
    const orderItem = await findUnreviewedOrderItemForReview(
      order.id,
      productId,
      connection
    );
    if (!orderItem) {
      // Either the product is not in this order at all, or that line has
      // already been reviewed. Distinguish the two only for a proven owner.
      const alreadyReviewed = await findReviewForOrderItem(
        await findAnyOrderItemId(order.id, productId, connection),
        connection
      );
      await connection.rollback();
      if (alreadyReviewed) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_REVIEW",
          message:
            alreadyReviewed.status === "rejected"
              ? "You have already reviewed this item from this order."
              : "You have already reviewed this item — thank you!",
        });
      }
      return res.status(403).json({
        success: false,
        code: "PRODUCT_NOT_IN_ORDER",
        message: "That product is not part of this order, so it can't be reviewed.",
      });
    }

    // 5. One review per order line. The unique index on order_item_id makes
    //    this race-proof even against two simultaneous submissions.
    const payload = await saveCustomerReview({ connection, order, orderItem, productId, data });
    await connection.commit();
    return res.status(201).json(payload);
  } catch (error) {
    await connection.rollback();
    // The unique key is the final guard against a double submission that
    // slipped past the check above.
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REVIEW",
        message: "You have already reviewed this item — thank you!",
      });
    }
    return sendDatabaseError(res, "review save failed", error);
  } finally {
    connection.release();
  }
});

/**
 * The half of submission that writes. Split out so the checks that prove the
 * purchase stay readable, and so the insert + rating re-sync are obviously one
 * unit of work.
 *
 * Assumes the connection is already inside a transaction, and must be called
 * before `commit()`.
 */
async function saveCustomerReview({ connection, order, orderItem, productId, data }) {
  // Write it. Status is hard-coded to 'approved' and source to 'customer' in
  // the repository, and verified_buyer to 1, because we got here only after
  // every check passed.
  const reviewId = await createReview(
    {
      orderId: order.id,
      // The order line the server resolved — the customer never sent this.
      orderItemId: Number(orderItem.order_item_id),
      orderNumber: order.order_number,
      productId,
      // The name is the snapshot from the order line, so the review still
      // reads correctly if the product is renamed or deleted later.
      productName: orderItem.product_name,
      customerName: data.customerName,
      customerEmail: data.email,
      rating: data.rating,
      reviewTitle: data.reviewTitle,
      reviewText: data.reviewText,
    },
    connection
  );

  // Recalculate the product's rating from its APPROVED CUSTOMER reviews only,
  // in the same transaction as the insert, so the stored average can never
  // drift from the reviews a visitor can actually see.
  const summary = await syncProductRating(productId, connection);

  // Read the new row back in its public shape. This object deliberately
  // has no email, no order number and no database id, so it is safe to
  // hand straight to the browser for an instant display.
  const review = await getPublicReviewById(reviewId, connection);

  return {
    success: true,
    status: "approved",
    verifiedBuyer: true,
    review,
    summary,
    message: "Thank you! Your review is verified and is now published.",
  };
}

/**
 * Look up the first order line for a product in an order, reviewed or not.
 * Only used to produce a precise "already reviewed" message for a customer
 * who has already proven they own the order.
 */
async function findAnyOrderItemId(orderId, productId, connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM order_items WHERE order_id = ? AND product_id = ? ORDER BY id ASC LIMIT 1",
    [orderId, String(productId)]
  );
  return rows[0]?.id ?? null;
}

// ========================================================
// 3. READ APPROVED REVIEWS  →  GET /api/reviews
// --------------------------------------------------------
// Approved only. The repository hard-codes status = 'approved',
// and this response never contains an email, an order number
// or a database id.
// ========================================================
router.get("/reviews", readLimiter, async (req, res) => {
  try {
    const limit = Number(req.query.limit);
    if (req.query.limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Limit must be a positive whole number.",
      });
    }

    const reviews = await listApprovedReviews({ limit });
    return res.status(200).json({ success: true, reviews, count: reviews.length });
  } catch (error) {
    return sendDatabaseError(res, "public review read failed", error);
  }
});

export default router;
