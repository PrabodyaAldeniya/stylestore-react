// ========================================
// ADMIN REVIEW API
// --------------------------------------------------------
// Mounted at /api/admin/reviews. Every route sits behind the
// existing requireAdmin session check, so none of them can be
// reached without the owner being signed in.
//
//   GET    /api/admin/reviews            — list, search, filter by
//                                         status and by source
//   GET    /api/admin/reviews/counts     — per-status / per-source totals
//   POST   /api/admin/reviews            — write an editorial review
//   PATCH  /api/admin/reviews/:id/status — approve, reject, hide,
//                                         archive, restore or redraft
//   DELETE /api/admin/reviews/:id        — delete for good
//
// Verified customer reviews are published automatically, so this API
// is for moderation after the fact plus the owner's own testimonials.
//
// An admin review is always source = 'admin' and never carries
// verified_buyer = 1, an order number or a customer email, so writing
// one here can never be mistaken for a purchase and can never consume
// a customer's one-review-per-item allowance. Because only
// source = 'customer' reviews feed a product's star rating, publishing
// or hiding a testimonial never changes the rating.
//
// This is the ONLY place the customer's email address and order
// number are ever returned. Any change to a review re-syncs the
// product's displayed rating from the approved CUSTOMER reviews so the
// shop never shows a stale average.
// ========================================
import express from "express";

import pool from "../db.js";
import {
  countReviewsByStatus,
  createAdminReview,
  deleteReview,
  getAdminReview,
  listAdminReviews,
  setReviewStatus,
  syncProductRating,
} from "../repositories/reviews.js";
import {
  MODERATION_STATUSES,
  parseReviewId,
  parseReviewSource,
  parseReviewStatus,
  reviewError,
  validateAdminReviewSubmission,
} from "../validation/review.js";
import { requireAdmin } from "../lib/auth.js";

const router = express.Router();

/**
 * The list filter. "all" — or no value at all — means "do not narrow",
 * which the shared write-path parser deliberately rejects. Everything
 * else is handed to it, so the filter and the create endpoint can never
 * drift apart on which source values are legal.
 */
function parseSource(value) {
  const raw = value === undefined || value === null ? "" : String(value).trim().toLowerCase();
  if (raw === "" || raw === "all") return "";
  return parseReviewSource(raw);
}

// Every route below sits behind the existing admin session check.
router.use(requireAdmin);

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/** Re-derive a product's average rating + count from its approved customer reviews. */
async function refreshProductRating(productId) {
  if (!productId) return null;
  try {
    return await syncProductRating(productId);
  } catch (error) {
    // A rating refresh must never fail the moderation action that triggered
    // it — the review status is already saved at this point.
    console.error(
      `[admin-reviews] rating refresh failed for product ${productId}:`,
      error?.message ?? "unknown"
    );
    return null;
  }
}

function parseStatusFilter(value) {
  if (value === undefined || value === null || value === "") return "";
  const status = String(value).trim().toLowerCase();
  if (!MODERATION_STATUSES.includes(status)) {
    throw reviewError(
      `Status filter must be one of: ${MODERATION_STATUSES.join(", ")}.`,
      "VALIDATION_ERROR",
      422
    );
  }
  return status;
}

/** A short sentence describing the effect of a moderation change. */
function describeStatusChange(status) {
  switch (status) {
    case "approved":
      return "Review published on the website.";
    case "rejected":
      return "Review rejected. It no longer appears on the website.";
    case "hidden":
      return "Review hidden from the website. You can restore it at any time.";
    case "archived":
      return "Review archived. It is kept on record and can be restored later.";
    case "draft":
      return "Review moved back to draft. It is not published.";
    default:
      return "Review moved back to pending.";
  }
}

// ------------------------------------------------------------
// LIST — every status and both sources, searchable by customer,
// order or product. `counts` and `pendingCount` drive the filter tabs
// and the badge shown elsewhere in the admin area.
// ------------------------------------------------------------
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await listAdminReviews({
      status: parseStatusFilter(req.query.status),
      // "all" (or nothing) shows both customer reviews and the owner's own
      // testimonials; "customer" or "admin" narrows to one. The shared
      // parser is used here so the list filter and the write endpoint
      // accept exactly the same values.
      source: parseSource(req.query.source),
      // Trimmed and length-capped here too: the search term goes into a
      // LIKE pattern, so an enormous value is refused before it is used.
      search: String(req.query.search || "").trim().slice(0, 120),
      limit: req.query.pageSize,
      page: req.query.page,
    });
    const counts = await countReviewsByStatus();
    res.json({
      success: true,
      ...result,
      counts,
      pendingCount: counts.pending,
    });
  })
);

// ------------------------------------------------------------
// COUNTS ONLY — a cheap call for the admin header badge, so the
// products page can show "N pending" without loading the list.
// ------------------------------------------------------------
router.get(
  "/counts",
  asyncRoute(async (_req, res) => {
    const counts = await countReviewsByStatus();
    res.json({ success: true, ...counts, pendingCount: counts.pending });
  })
);

// ------------------------------------------------------------
// CREATE — an editorial testimonial written by the owner.
//
// source, verified_buyer and the absence of an order are all decided
// inside the repository, not taken from this request. The owner only
// chooses the product, the words, the rating and the starting state.
// ------------------------------------------------------------
router.post(
  "/",
  asyncRoute(async (req, res) => {
    let data;
    try {
      data = validateAdminReviewSubmission(req.body ?? {});
    } catch (error) {
      return res.status(error.status || 422).json({
        success: false,
        code: error.code || "VALIDATION_ERROR",
        message: error.message || "Please check the review form.",
        ...(error.fields ? { fields: error.fields } : {}),
      });
    }

    const connection = await pool.getConnection();
    let reviewId;
    try {
      await connection.beginTransaction();

      // The product name is snapshotted from the live row so the testimonial
      // still reads correctly if the product is renamed or removed later.
      const [rows] = await connection.execute(
        "SELECT name FROM products WHERE id = ? LIMIT 1",
        [data.productId]
      );
      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      reviewId = await createAdminReview(
        {
          productId: data.productId,
          productName: rows[0].name,
          customerName: data.customerName,
          rating: data.rating,
          reviewTitle: data.reviewTitle,
          reviewText: data.reviewText,
          status: data.status,
        },
        connection
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("[admin-reviews] create failed:", error?.message ?? "unknown");
      return res.status(503).json({
        success: false,
        code: "DB_UNAVAILABLE",
        message: "The review could not be saved. Please try again.",
      });
    } finally {
      connection.release();
    }

    const review = await getAdminReview(reviewId);
    // A testimonial never moves the star rating, but the endpoint still
    // returns a summary so the admin UI has one consistent response shape.
    const summary = await refreshProductRating(review?.productId);

    return res.status(201).json({
      success: true,
      review,
      summary,
      counts: await countReviewsByStatus(),
      message:
        data.status === "approved"
          ? "Testimonial published. It does not affect the product's star rating."
          : "Testimonial saved. It is not published yet.",
    });
  })
);

// ------------------------------------------------------------
// MODERATE — approve, reject, hide, archive, restore or redraft.
// ------------------------------------------------------------
router.patch(
  "/:id/status",
  asyncRoute(async (req, res) => {
    const id = parseReviewId(req.params.id);
    const status = parseReviewStatus(req.body?.status);
    const review = await setReviewStatus(id, status);
    if (!review) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Review not found.",
      });
    }
    const summary = await refreshProductRating(review.productId);
    res.json({
      success: true,
      review,
      summary,
      counts: await countReviewsByStatus(),
      message: describeStatusChange(status),
    });
  })
);

// ------------------------------------------------------------
// DELETE — for an inappropriate or abusive review. The product
// rating is re-synced so it stops counting.
// ------------------------------------------------------------
router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = parseReviewId(req.params.id);
    const existing = await getAdminReview(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Review not found.",
      });
    }
    const removed = await deleteReview(id);
    if (!removed) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Review not found.",
      });
    }
    const summary = await refreshProductRating(existing.productId);
    res.json({
      success: true,
      review: existing,
      summary,
      counts: await countReviewsByStatus(),
      message: "Review deleted. It is no longer counted towards the product rating.",
    });
  })
);

export default router;
