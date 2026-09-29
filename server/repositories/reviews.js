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
import {
  DELIVERED_ORDER_STATUS,
  REVIEW_SOURCE_LABELS,
  reviewError,
  toPublicName,
} from "../validation/review.js";

const MAX_PUBLIC_LIMIT = 60;
const MAX_ADMIN_LIMIT = 200;
const DEFAULT_PUBLIC_LIMIT = 12;

// Columns a public visitor is allowed to see. Note what is missing:
// customer_email, order_number, order_id, order_item_id and the review id.
const PUBLIC_COLUMNS = `
  r.rating,
  r.review_title,
  r.review_text,
  r.customer_name,
  r.verified_buyer,
  r.source,
  r.product_id,
  r.product_name,
  r.created_at`;

// The live product name wins when the product still exists; the snapshot on
// the review is the fallback, so a deleted product never blanks a review.
const PRODUCT_NAME = "COALESCE(p.name, r.product_name)";

// The order status that unlocks a review. Read from one place so the
// repository and the API message can never drift apart.
const DELIVERED = DELIVERED_ORDER_STATUS;

/** Public, privacy-safe review object. */
function toPublicReview(row) {
  const source = row.source === "admin" ? "admin" : "customer";
  return {
    rating: Number(row.rating),
    title: row.review_title || null,
    text: row.review_text,
    // First name + last initial only. The full name stays in the admin view.
    name: toPublicName(row.customer_name),
    verifiedBuyer: Boolean(row.verified_buyer),
    // Lets the storefront label an editorial testimonial honestly instead of
    // passing it off as a customer purchase.
    source,
    sourceLabel: REVIEW_SOURCE_LABELS[source],
    productId: row.product_id === null ? null : Number(row.product_id),
    productName: row.product_name,
    createdAt: row.created_at,
  };
}

/** Full admin object, including the details only the owner may see. */
function toAdminReview(row) {
  const source = row.source === "admin" ? "admin" : "customer";
  return {
    id: Number(row.id),
    status: row.status,
    source,
    sourceLabel: REVIEW_SOURCE_LABELS[source],
    rating: Number(row.rating),
    title: row.review_title || null,
    text: row.review_text,
    customerName: row.customer_name,
    // Admin-only. Never sent to the public review endpoints.
    customerEmail: row.customer_email,
    orderNumber: row.order_number,
    orderId: row.order_id === null ? null : Number(row.order_id),
    orderItemId: row.order_item_id === null ? null : Number(row.order_item_id),
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
// A "Verified Buyer" badge is earned here and nowhere else, and the
// three conditions below must all hold before a single word of a
// customer's review is stored:
//
//   1. the order number AND the checkout email must match ONE row in
//      `orders` — an order number on its own proves nothing, which is
//      why the email is mandatory;
//   2. that order must have reached the 'delivered' status — a
//      pending, paid-but-undelivered or cancelled order is not a
//      finished purchase, so nothing in it can be reviewed yet;
//   3. the product must be on a specific order line that has no
//      review yet, and that line's id is stored on the review so
//      "one review per purchased item" is a database rule.
//
// The customer never sees or sends an internal order id or order-item
// id: they send the order number, the email and the product id, and
// the server resolves the line itself.
// ========================================================

/**
 * Find the order a review claim belongs to. Returns null when the order
 * number does not exist or the email does not match, so the caller cannot
 * tell the difference and cannot be used to probe for valid order numbers.
 *
 * The delivered check is NOT done here: the route needs the order either way
 * so it can tell a proven customer "reviews open once your order is
 * delivered" instead of the generic "we could not find that order", which
 * would be a dead end for a real shopper.
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

/** Has this order been delivered? The single gate for customer reviews. */
export function isOrderDelivered(order) {
  return Boolean(order) && String(order.status || "").toLowerCase() === DELIVERED;
}

/**
 * The products inside a verified order, each flagged with whether a review
 * already exists for that exact line. This is what the review form shows the
 * customer, so they can only ever pick something they actually bought.
 *
 * Joining on `order_item_id` (not order + product) is what makes a second
 * line of the same product — a different size, say — separately reviewable.
 */
export async function listOrderReviewableProducts(orderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT oi.id AS order_item_id,
            oi.product_id,
            oi.product_name,
            oi.product_image_path,
            oi.size,
            oi.color,
            oi.quantity,
            r.id AS review_id,
            r.status AS review_status
       FROM order_items oi
       LEFT JOIN product_reviews r
              ON r.order_item_id = oi.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId]
  );

  return rows.map((row) => ({
    productId: Number(row.product_id),
    productName: row.product_name,
    imagePath: row.product_image_path || null,
    variant: [row.size, row.color].filter(Boolean).join(" · ") || null,
    quantity: Number(row.quantity || 1),
    // Already reviewed lines are still listed (the customer may have several
    // items) but marked so the form can explain why they cannot be picked.
    alreadyReviewed: row.review_id !== null,
    reviewStatus: row.review_id === null ? null : row.review_status,
  }));
}

/**
 * The unreviewed order line a customer wants to review, or null.
 *
 * The server resolves the line itself and hands back its id; the browser only
 * ever sent a product id. The LEFT JOIN against product_reviews is what
 * guarantees the returned line is genuinely unreviewed, so two simultaneous
 * submissions cannot both pass the check.
 */
export async function findUnreviewedOrderItemForReview(
  orderId,
  productId,
  connection = pool
) {
  const [rows] = await connection.execute(
    `SELECT oi.id AS order_item_id,
            oi.product_id,
            oi.product_name,
            oi.product_image_path,
            oi.size,
            oi.color,
            oi.quantity
       FROM order_items oi
       LEFT JOIN product_reviews r
              ON r.order_item_id = oi.id
      WHERE oi.order_id = ?
        AND oi.product_id = ?
        AND r.id IS NULL
      ORDER BY oi.id ASC
      LIMIT 1`,
    [orderId, String(productId)]
  );
  return rows[0] || null;
}

/** Existing review for one order line, or null. */
export async function findReviewForOrderItem(orderItemId, connection = pool) {
  if (!orderItemId) return null;
  const [rows] = await connection.execute(
    `SELECT id, status FROM product_reviews
      WHERE order_item_id = ? LIMIT 1`,
    [orderItemId]
  );
  return rows[0] || null;
}

// Note: there is deliberately no "existing review for this order + product"
// lookup. That was the old one-review-per-product rule, and it would stop a
// customer from reviewing the second size of a dress they bought in the same
// order. Eligibility is decided per order line only.

// ========================================================
// WRITING A REVIEW
// ========================================================

/**
 * Save a review a CUSTOMER wrote about a product they bought.
 *
 * AUTO-PUBLISH RULE: the status is written as 'approved', source as
 * 'customer' and verified_buyer as 1 right here, because the caller only
 * reaches this function after the order number, the checkout email, the
 * delivered status, the exact unreviewed order line, the rating and the
 * review text have all been verified. None of those three values is ever
 * read from the request body, so a customer can never choose to publish,
 * claim to be an admin review, or skip the purchase check.
 *
 * The unique index on order_item_id turns a double submission into an
 * ER_DUP_ENTRY, which the caller maps to a friendly "already reviewed"
 * message — so the check is safe even against two clicks at once.
 */
export async function createReview(
  {
    orderId,
    orderItemId,
    orderNumber,
    productId,
    productName,
    customerName,
    customerEmail,
    rating,
    reviewTitle,
    reviewText,
  },
  connection = pool
) {
  const [result] = await connection.execute(
    `INSERT INTO product_reviews
       (product_id, product_name, order_id, order_item_id, order_number,
        customer_name, customer_email, rating, review_title, review_text,
        verified_buyer, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'customer', 'approved')`,
    [
      productId,
      productName,
      orderId,
      orderItemId,
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

/**
 * Save a review the STORE OWNER wrote — an editorial testimonial.
 *
 * Differences from a customer review, all enforced here rather than trusted
 * from the request:
 *   * source is always 'admin'
 *   * verified_buyer is always 0, so it can never wear the
 *     "Verified Buyer" badge
 *   * order_id, order_item_id, order_number and customer_email are all NULL
 *     — an editorial review is attached to no purchase, so it does not
 *     consume a customer's one-review-per-item allowance either
 *
 * Because order_id is NULL, the UNIQUE(order_id, product_id) index does not
 * apply and the owner can write as many testimonials per product as they like.
 * The status is the owner's choice, defaulting to 'draft'.
 */
export async function createAdminReview(
  { productId, productName, customerName, rating, reviewTitle, reviewText, status = "draft" },
  connection = pool
) {
  const [result] = await connection.execute(
    `INSERT INTO product_reviews
       (product_id, product_name, order_id, order_item_id, order_number,
        customer_name, customer_email, rating, review_title, review_text,
        verified_buyer, source, status)
     VALUES (?, ?, NULL, NULL, NULL, ?, NULL, ?, ?, ?, 0, 'admin', ?)`,
    [productId, productName, customerName, rating, reviewTitle || null, reviewText, status]
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

/**
 * One review by id, in the same privacy-safe shape the public list uses.
 * Used right after an auto-approved insert so the browser can show the new
 * review immediately — without ever receiving an email, an order number or an
 * internal id.
 */
export async function getPublicReviewById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${PUBLIC_COLUMNS}, ${PRODUCT_NAME} AS product_name
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
      WHERE r.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] ? toPublicReview(rows[0]) : null;
}

/**
 * Average rating + review count for one product, from approved CUSTOMER
 * reviews only.
 *
 * The `source = 'customer'` filter is the honest-star-rating rule: an
 * editorial testimonial the store wrote for itself may be shown on the page
 * as a testimonial, but it must never inflate or drag down the number a
 * shopper reads as "what buyers say about this product".
 */
export async function getApprovedReviewSummary(productId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS review_count,
            COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
       FROM product_reviews
      WHERE product_id = ? AND status = 'approved' AND source = 'customer'`,
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
 * Admin list with search across customer, order number and product, plus
 * per-status and per-source counts used for the filter tabs, the source
 * toggle and the pending badge.
 *
 * `source` is filtered here rather than in the route so the "Customer
 * reviews" / "Editorial" views are each a single indexed query.
 */
export async function listAdminReviews(
  { status = "", source = "", search = "", limit, page = 1 } = {},
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
  if (source) {
    conditions.push("r.source = ?");
    values.push(source);
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

  // Pending first because that is what needs a decision, then approved, then
  // the owner's own drafts, then the retired states.
  const [rows] = await connection.execute(
    `SELECT r.id, r.status, r.source, r.rating, r.review_title, r.review_text,
            r.customer_name, r.customer_email, r.order_number, r.order_id,
            r.order_item_id, r.product_id, r.verified_buyer, r.created_at, r.updated_at,
            ${PRODUCT_NAME} AS product_name
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${where}
      ORDER BY FIELD(r.status, 'pending', 'draft', 'approved', 'rejected', 'hidden', 'archived'),
               FIELD(r.source, 'customer', 'admin'),
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

/**
 * Per-status and per-source totals — drive the admin tabs, the source toggle
 * and the "needs attention" badge. Every status is pre-seeded so the UI can
 * render a tab for a state that currently has no rows.
 */
export async function countReviewsByStatus(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT status, source, COUNT(*) AS total
       FROM product_reviews
      GROUP BY status, source`
  );

  const counts = { draft: 0, pending: 0, approved: 0, rejected: 0, hidden: 0, archived: 0 };
  const bySource = { customer: 0, admin: 0 };
  let total = 0;
  for (const row of rows) {
    const amount = Number(row.total || 0);
    total += amount;
    if (row.status in counts) counts[row.status] += amount;
    if (row.source in bySource) bySource[row.source] += amount;
  }
  // `statuses` is kept alongside the flat keys so the existing admin UI
  // (which reads counts.pending etc.) keeps working untouched.
  return { ...counts, bySource, total, statuses: counts };
}

export async function getAdminReview(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT r.id, r.status, r.source, r.rating, r.review_title, r.review_text,
            r.customer_name, r.customer_email, r.order_number, r.order_id,
            r.order_item_id, r.product_id, r.verified_buyer, r.created_at, r.updated_at,
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
 * Move a review to any moderation state: draft, pending, approved, rejected,
 * hidden or archived. Returns the updated review, or null when the id does
 * not exist.
 *
 * This one function covers every action on the admin page, including the
 * "restore" that puts an archived or hidden review back to approved, and
 * "archive", which retires a review without destroying the customer's record
 * of what they wrote. The product rating is re-synced afterwards so the
 * public numbers always match the set of approved customer reviews.
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
 * Recalculate a product's displayed rating from its APPROVED CUSTOMER reviews
 * and store it on products.rating / products.rating_count, which is what the
 * product cards and the "Highest Rated" sort already read.
 *
 * Editorial admin reviews are excluded here for the same reason as in
 * getApprovedReviewSummary: the displayed star rating must reflect real
 * purchases only.
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
      WHERE product_id = ? AND status = 'approved' AND source = 'customer'`,
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
