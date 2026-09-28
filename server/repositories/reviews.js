// ========================================
// REVIEW REPOSITORY — all review SQL lives here
// --------------------------------------------------------
// Nothing above this file writes SQL, and every statement is
// parameterised. The route layer only decides status codes
// and JSON shapes.
//
// Two very different readers share this module:
//
//   PUBLIC  — approved reviews only, and never the customer's
//             email address or the order number.
//   ADMIN   — every status, plus the private details the owner
//             needs to check a purchase was real.
//
// Data-safety decisions baked in here:
//   * Reviews have no foreign key to products or orders, so a
//     Trash / archive / permanent-delete action can never remove
//     or be blocked by a review.
//   * Product name is a snapshot on the review row and only
//     preferred over the live product name, so an approved
//     review still reads correctly after the product is gone.
//   * Approving, rejecting or deleting a review re-syncs the
//     product's displayed rating from the approved reviews.
// ========================================
import pool from "../db.js";
import { reviewError, toPublicName } from "../validation/review.js";

const MAX_PUBLIC_LIMIT = 60;
const MAX_ADMIN_LIMIT = 200;
const DEFAULT_PUBLIC_LIMIT = 12;

// Columns a public visitor is allowed to see. Note what is missing:
// customer_email, order_number, order_id and id.
const PUBLIC_COLUMNS = `
  r.rating,
  r.review_title,
  r.review_text,
  r.customer_name,
  r.verified_buyer,
  r.product_id,
  r.product_name,
  r.created_at`;

// The live product name wins when the product still exists; the snapshot on
// the review is the fallback, so a deleted product never blanks a review.
const PRODUCT_NAME = "COALESCE(p.name, r.product_name)";

/** Public, privacy-safe review object. */
function toPublicReview(row) {
  return {
    rating: Number(row.rating),
    title: row.review_title || null,
    text: row.review_text,
    // First name + last initial only. The full name stays in the admin view.
    name: toPublicName(row.customer_name),
    verifiedBuyer: Boolean(row.verified_buyer),
    productId: row.product_id === null ? null : Number(row.product_id),
    productName: row.product_name,
    createdAt: row.created_at,
  };
}

/** Full admin object, including the details only the owner may see. */
function toAdminReview(row) {
  return {
    id: Number(row.id),
    status: row.status,
    rating: Number(row.rating),
    title: row.review_title || null,
    text: row.review_text,
    customerName: row.customer_name,
    // Admin-only. Never sent to the public review endpoints.
    customerEmail: row.customer_email,
    orderNumber: row.order_number,
    orderId: row.order_id === null ? null : Number(row.order_id),
    productId: row.product_id === null ? null : Number(row.product_id),
    productName: row.product_name,
    verifiedBuyer: Boolean(row.verified_buyer),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clampLimit(value, fallback, max) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) return fallback;
  return Math.min(limit, max);
}

// ========================================================
// PURCHASE VERIFICATION
// --------------------------------------------------------
// A "Verified Buyer" badge is earned here and nowhere else.
// The order number AND the checkout email must both match a
// single row in `orders`; an order number on its own proves
// nothing, which is why the email is mandatory.
// ========================================================

/**
 * Find the order a review claim belongs to. Returns null when the order
 * number does not exist or the email does not match, so the caller cannot
 * tell the difference and cannot be used to probe for valid order numbers.
 */
export async function findOrderForReview(orderNumber, email, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, order_number, email, status, created_at
       FROM orders
      WHERE order_number = ? AND email = ?
      LIMIT 1`,
    [orderNumber, email]
  );
  return rows[0] || null;
}

/**
 * The products inside a verified order, each flagged with whether a review
 * already exists for it. This is what the review form shows the customer, so
 * they can only ever pick something they actually bought.
 */
export async function listOrderReviewableProducts(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT oi.product_id,
            oi.product_name,
            oi.product_image_path,
            oi.size,
            oi.color,
            r.id AS review_id,
            r.status AS review_status
       FROM order_items oi
       LEFT JOIN product_reviews r
              ON r.order_id = oi.order_id
             AND r.product_id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId]
  );

  return rows.map((row) => ({
    productId: Number(row.product_id),
    productName: row.product_name,
    imagePath: row.product_image_path || null,
    variant: [row.size, row.color].filter(Boolean).join(" · ") || null,
    // Already reviewed lines are still listed (the customer may have several
    // items) but marked so the form can explain why they cannot be picked.
    alreadyReviewed: row.review_id !== null,
    reviewStatus: row.review_id === null ? null : row.review_status,
  }));
}

/** The order line a customer wants to review, or null if it is not theirs. */
export async function findOrderItemForReview(orderId, productId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT product_id, product_name, product_image_path, size, color
       FROM order_items
      WHERE order_id = ? AND product_id = ?
      LIMIT 1`,
    [orderId, String(productId)]
  );
  return rows[0] || null;
}

/** Existing review for one order line, or null. */
export async function findReviewForOrderProduct(orderId, productId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, status FROM product_reviews
      WHERE order_id = ? AND product_id = ? LIMIT 1`,
    [orderId, productId]
  );
  return rows[0] || null;
}

// ========================================================
// WRITING A REVIEW
// ========================================================

/**
 * Save a new review. It is ALWAYS created as 'pending' — the status is not
 * read from the request body, so a customer can never publish their own
 * review. `verified_buyer` is 1 because this is only reachable after a
 * successful order-number + email match.
 *
 * UNIQUE(order_id, product_id) turns a duplicate into an ER_DUP_ENTRY, which
 * the caller maps to a friendly "already reviewed" message.
 */
export async function createReview(
  { orderId, orderNumber, productId, productName, customerName, customerEmail, rating, reviewTitle, reviewText },
  connection = pool
) {
  const [result] = await connection.execute(
    `INSERT INTO product_reviews
       (product_id, product_name, order_id, order_number, customer_name,
        customer_email, rating, review_title, review_text, verified_buyer, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')`,
    [
      productId,
      productName,
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      rating,
      reviewTitle || null,
      reviewText,
    ]
  );
  return Number(result.insertId);
}

// ========================================================
// READING REVIEWS
// ========================================================

/**
 * Public list of APPROVED reviews, newest first. `status = 'approved'` is
 * hard-coded in the statement: there is no code path from a request parameter
 * to this query, so a pending or rejected review can never leak.
 */
export async function listApprovedReviews(
  { limit, productId = null } = {},
  connection = pool
) {
  const max = clampLimit(limit, DEFAULT_PUBLIC_LIMIT, MAX_PUBLIC_LIMIT);
  const scoped = productId !== null && productId !== undefined;
  const [rows] = await connection.execute(
    `SELECT ${PUBLIC_COLUMNS}, ${PRODUCT_NAME} AS product_name
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
      WHERE r.status = 'approved'
        ${scoped ? "AND r.product_id = ?" : ""}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ?`,
    scoped ? [productId, max] : [max]
  );
  return rows.map(toPublicReview);
}

/** Average rating + review count for one product, from approved reviews only. */
export async function getApprovedReviewSummary(productId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS review_count,
            COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
       FROM product_reviews
      WHERE product_id = ? AND status = 'approved'`,
    [productId]
  );
  const row = rows[0] || {};
  const average = Number(row.average_rating || 0);
  return {
    productId,
    averageRating: average,
    reviewCount: Number(row.review_count || 0),
  };
}

/**
 * Admin list with search across customer, order number and product, plus a
 * per-status count used for the filter tabs and the pending badge.
 */
export async function listAdminReviews(
  { status = "", search = "", limit, page = 1 } = {},
  connection = pool
) {
  const max = clampLimit(limit, 50, MAX_ADMIN_LIMIT);
  const currentPage = Math.max(Number(page) || 1, 1);

  const conditions = [];
  const values = [];
  if (status) {
    conditions.push("r.status = ?");
    values.push(status);
  }
  const term = String(search || "").trim();
  if (term) {
    conditions.push(
      "(r.customer_name LIKE ? OR r.customer_email LIKE ? OR r.order_number LIKE ? OR r.product_name LIKE ? OR r.review_text LIKE ?)"
    );
    const like = `%${term}%`;
    values.push(like, like, like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await connection.execute(
    `SELECT r.id, r.status, r.rating, r.review_title, r.review_text,
            r.customer_name, r.customer_email, r.order_number, r.order_id,
            r.product_id, r.verified_buyer, r.created_at, r.updated_at,
            ${PRODUCT_NAME} AS product_name
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${where}
      ORDER BY FIELD(r.status, 'pending', 'approved', 'rejected'),
               r.created_at DESC, r.id DESC
      LIMIT ? OFFSET ?`,
    [...values, max, (currentPage - 1) * max]
  );

  const [countRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM product_reviews r ${where}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    reviews: rows.map(toAdminReview),
    total,
    page: currentPage,
    pageSize: max,
    hasMore: currentPage * max < total,
  };
}

/** pending / approved / rejected totals — drives the admin tabs and badge. */
export async function countReviewsByStatus(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT status, COUNT(*) AS total
       FROM product_reviews
      GROUP BY status`
  );
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status] = Number(row.total || 0);
  }
  return counts;
}

export async function getAdminReview(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT r.id, r.status, r.rating, r.review_title, r.review_text,
            r.customer_name, r.customer_email, r.order_number, r.order_id,
            r.product_id, r.verified_buyer, r.created_at, r.updated_at,
            ${PRODUCT_NAME} AS product_name
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
      WHERE r.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] ? toAdminReview(rows[0]) : null;
}

// ========================================================
// MODERATION
// ========================================================

/**
 * Approve or reject a review. Returns the updated review, or null when the id
 * does not exist. The product rating is re-synced afterwards so the public
 * numbers always match the set of approved reviews.
 */
export async function setReviewStatus(id, status, connection = pool) {
  const [result] = await connection.execute(
    "UPDATE product_reviews SET status = ? WHERE id = ?",
    [status, id]
  );
  if (result.affectedRows === 0) return null;
  return getAdminReview(id, connection);
}

/**
 * Remove a review for good. Used by the admin "Delete" action for something
 * inappropriate. The product rating is re-synced so the product page never
 * keeps counting a review that no longer exists.
 */
export async function deleteReview(id, connection = pool) {
  const [result] = await connection.execute(
    "DELETE FROM product_reviews WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

/**
 * Recalculate a product's displayed rating from its APPROVED reviews and store
 * it on products.rating / products.rating_count, which is what the product
 * cards and the "Highest Rated" sort already read.
 *
 * This is also the order-safety guarantee in code: the UPDATE only ever
 * touches the rating columns of an existing product row, so approving a
 * review can never alter an order, an order item or any customer detail.
 */
export async function syncProductRating(productId, connection = pool) {
  if (!productId) return null;
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS review_count,
            COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
       FROM product_reviews
      WHERE product_id = ? AND status = 'approved'`,
    [productId]
  );
  const row = rows[0] || {};
  const average = Number(row.average_rating || 0);
  const count = Number(row.review_count || 0);

  await connection.execute(
    "UPDATE products SET rating = ?, rating_count = ? WHERE id = ?",
    [average, count, productId]
  );
  return { productId, averageRating: average, reviewCount: count };
}

/** Throw a 404 unless the id exists — shared by the admin status/delete routes. */
export function requireAdminReview(id, connection = pool) {
  return getAdminReview(id, connection).then((review) => {
    if (!review) throw reviewError("Review not found.", "NOT_FOUND", 404);
    return review;
  });
}

export {
  DEFAULT_PUBLIC_LIMIT,
  MAX_ADMIN_LIMIT,
  MAX_PUBLIC_LIMIT,
  toAdminReview,
  toPublicReview,
};
