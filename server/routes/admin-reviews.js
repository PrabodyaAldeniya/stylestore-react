// ========================================
// ADMIN REVIEW API
// --------------------------------------------------------
// Mounted at /api/admin/reviews. Every route sits behind the
// existing requireAdmin session check, so none of them can be
// reached without the owner being signed in.
//
//   GET    /api/admin/reviews           — list, search, filter
//   GET    /api/admin/reviews/counts    — pending/approved/rejected
//   PATCH  /api/admin/reviews/:id/status— approve or reject
//   DELETE /api/admin/reviews/:id       — delete for good
//
// This is the ONLY place the customer's email address and order
// number are ever returned. Approving, rejecting or deleting a
// review re-syncs the product's displayed rating from the
// approved reviews so the shop never shows a stale average.
// ========================================
import express from "express";

import {
  countReviewsByStatus,
  deleteReview,
  getAdminReview,
  listAdminReviews,
  setReviewStatus,
  syncProductRating,
} from "../repositories/reviews.js";
import { parseReviewId, parseReviewStatus } from "../validation/review.js";
import { requireAdmin } from "../lib/auth.js";

const router = express.Router();

// Every route below sits behind the existing admin session check.
router.use(requireAdmin);

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/** Re-derive a product's average rating + count from its approved reviews. */
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
  if (!["pending", "approved", "rejected"].includes(status)) {
    const error = new Error("Status filter must be pending, approved or rejected.");
    error.code = "VALIDATION_ERROR";
    error.status = 422;
    throw error;
  }
  return status;
}

// ------------------------------------------------------------
// LIST — every status, searchable by customer, order or product.
// `counts` and `pendingCount` drive the filter tabs and the badge
// shown elsewhere in the admin area.
// Declared before "/counts" is unnecessary (different verbs) but
// kept above "/:id" style routes for clarity.
// ------------------------------------------------------------
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await listAdminReviews({
      status: parseStatusFilter(req.query.status),
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
// APPROVE / REJECT
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
      message:
        status === "approved"
          ? "Review approved and published on the website."
          : status === "rejected"
            ? "Review rejected. It stays hidden from the website."
            : "Review moved back to pending.",
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
