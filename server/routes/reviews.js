// ========================================
// PUBLIC REVIEW API
// --------------------------------------------------------
// Mounted at /api, so the customer-facing endpoints are:
//
//   POST /api/reviews/verify  — check an order number + email
//                               and list what can be reviewed
//   POST /api/reviews        — submit a review (saved pending)
//   GET  /api/reviews        — approved reviews only
//
// Safety rules for this file:
//   * every SQL statement is parameterised and lives in
//     repositories/reviews.js
//   * a review can only be written for a product that is in the
//     order the customer proved they own
//   * "Verified Buyer" is set by the server after that proof, never
//     by the browser
//   * the status is always 'pending'; there is no way to publish
//     your own review
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
  findOrderItemForReview,
  findReviewForOrderProduct,
  listApprovedReviews,
  listOrderReviewableProducts,
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
// No product can be offered here that is not genuinely theirs.
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

    const products = await listOrderReviewableProducts(order.id);
    return res.status(200).json({
      success: true,
      // The order number is echoed back because the customer just typed it —
      // it is their own number, not someone else's, and it is never stored in
      // the browser or shown to other visitors.
      orderNumber: order.order_number,
      orderPlacedAt: order.created_at,
      products,
      reviewableCount: products.filter((product) => !product.alreadyReviewed).length,
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
// the earlier step), the product is confirmed to be inside that
// order, a duplicate is refused, and the row is written as
// 'pending'.
// ========================================================
router.post("/reviews", submitLimiter, async (req, res) => {
  const body = req.body ?? {};

  // Honeypot + cheap spam heuristics before any database work.
  const spam = findSpamReason(body);
  if (spam === "honeypot") {
    return res.status(200).json({
      success: true,
      message: "Thank you! Your review was submitted and is awaiting approval.",
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

    // 3. The product must be one of the items in that order.
    const orderItem = await findOrderItemForReview(order.id, productId, connection);
    if (!orderItem) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        code: "PRODUCT_NOT_IN_ORDER",
        message: "That product is not part of this order, so it can't be reviewed.",
      });
    }

    // 4. One review per order line. The unique index makes this race-proof.
    const existing = await findReviewForOrderProduct(order.id, productId, connection);
    if (existing) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REVIEW",
        message:
          existing.status === "rejected"
            ? "You have already reviewed this item from this order."
            : "You have already reviewed this item — thank you!",
      });
    }

    // 5. Write it. Status is hard-coded to 'pending' in the repository and
    //    verified_buyer to 1, because we got here only after step 2 passed.
    await createReview(
      {
        orderId: order.id,
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

    await connection.commit();
    return res.status(201).json({
      success: true,
      status: "pending",
      verifiedBuyer: true,
      message: "Thank you! Your review was submitted and is awaiting approval.",
    });
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
