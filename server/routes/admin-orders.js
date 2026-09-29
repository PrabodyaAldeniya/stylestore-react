// ========================================
// ADMIN ORDER STATUS API
// --------------------------------------------------------
// Mounted at /api/admin/orders. Every route sits behind the existing
// requireAdmin session check.
//
//   GET   /api/admin/orders            — recent orders, newest first
//   PATCH /api/admin/orders/:number/status — move an order to a new
//                                          fulfilment state
//
// WHY THIS EXISTS: a customer may only review a product once their order
// has actually been delivered. Nothing in the checkout flow sets that
// automatically — a real store marks the parcel as delivered when the
// courier hands it over. Without this endpoint the review system would be
// unusable, because no order would ever reach the 'delivered' status that
// unlocks it.
//
// This route only ever changes `orders.status`. It never touches order
// items, product rows, stock counts or any customer contact detail, so
// marking an order delivered cannot alter what the customer bought or
// what they paid.
// ========================================
import express from "express";

import pool from "../db.js";
import { requireAdmin } from "../lib/auth.js";

const router = express.Router();

// Every route below sits behind the existing admin session check.
router.use(requireAdmin);

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// The fulfilment states an order can be in. `delivered` is the one that
// unlocks customer reviews, so it is deliberately an explicit choice here
// rather than something a request can set implicitly.
const ORDER_STATUSES = ["pending", "paid", "packed", "shipped", "delivered", "cancelled"];

// Same shape the checkout API generates: SS-YYYYMMDD-XXXXX
const ORDER_NUMBER_PATTERN = /^SS-\d{8}-[A-Z0-9]{5}$/;

const ORDER_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function parseOrderNumber(value) {
  const orderNumber = String(value || "").trim().toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    const error = new Error("Enter a valid order number, e.g. SS-20250101-AB12C.");
    error.code = "VALIDATION_ERROR";
    error.status = 422;
    throw error;
  }
  return orderNumber;
}

function parseOrderStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (!ORDER_STATUSES.includes(status)) {
    const error = new Error(`Status must be one of: ${ORDER_STATUSES.join(", ")}.`);
    error.code = "VALIDATION_ERROR";
    error.status = 422;
    throw error;
  }
  return status;
}

// ------------------------------------------------------------
// LIST — the most recent orders, so the owner can find one by number
// without leaving the admin area. Returns the order number and status
// only; no customer contact details are needed for this job.
// ------------------------------------------------------------
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const [rows] = await pool.execute(
      `SELECT o.order_number,
              o.status,
              o.total,
              o.created_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
              (SELECT COUNT(*) FROM product_reviews r
                WHERE r.order_id = o.id) AS review_count
         FROM orders o
        ORDER BY o.created_at DESC
        LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      orders: rows.map((row) => ({
        orderNumber: row.order_number,
        status: row.status,
        statusLabel: ORDER_STATUS_LABELS[row.status] || row.status,
        total: Number(row.total || 0),
        itemCount: Number(row.item_count || 0),
        // How many of the order's lines have a review. 0 while the order is
        // still in transit, because reviews only open after delivery.
        reviewCount: Number(row.review_count || 0),
        createdAt: row.created_at,
      })),
    });
  })
);

// ------------------------------------------------------------
// UPDATE STATUS — the action that makes a customer eligible to review.
// ------------------------------------------------------------
router.patch(
  "/:orderNumber/status",
  asyncRoute(async (req, res) => {
    const orderNumber = parseOrderNumber(req.params.orderNumber);
    const status = parseOrderStatus(req.body?.status);

    const [result] = await pool.execute("UPDATE orders SET status = ? WHERE order_number = ?", [
      status,
      orderNumber,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Order not found.",
      });
    }

    return res.json({
      success: true,
      orderNumber,
      status,
      statusLabel: ORDER_STATUS_LABELS[status],
      message:
        status === "delivered"
          ? "Order marked as delivered. Its products can now be reviewed by the customer."
          : `Order marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}.`,
    });
  })
);

export { ORDER_STATUSES, ORDER_STATUS_LABELS };
export default router;
