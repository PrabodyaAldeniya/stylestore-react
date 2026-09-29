import { API_BASE } from "./checkout";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.message || "The admin request could not be completed.");
    error.code = data.code;
    error.fields = data.fields;
    throw error;
  }
  return data;
}

export function getAdminSession() {
  return request("/api/auth/me");
}

export function loginAdmin(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutAdmin() {
  return request("/api/auth/logout", { method: "POST" });
}

export function listAdminProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/products${query.toString() ? `?${query}` : ""}`);
}

/** Products currently in the Trash (soft deleted, still restorable). */
export function listTrashedProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/products/trash${query.toString() ? `?${query}` : ""}`);
}

export function getAdminCatalogueMeta() {
  return request("/api/admin/products/meta");
}

export function getAdminProduct(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}`);
}

export function createAdminProduct(formData) {
  return request("/api/admin/products", { method: "POST", body: formData });
}

export function updateAdminProduct(id, formData) {
  return request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: formData,
  });
}

export function updateAdminProductStatus(id, status) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function setAdminProductPrimaryImage(id, imageId) {
  return request(
    `/api/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}/primary`,
    { method: "PATCH" }
  );
}

export function deleteAdminProductImage(id, imageId) {
  return request(
    `/api/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" }
  );
}

/**
 * Soft delete — the "Delete" button in the admin product list. The product is
 * moved to the Trash: hidden from the store, fully restorable, and its database
 * record and uploaded images are left untouched.
 */
export function moveProductToTrash(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/trash`, { method: "POST" });
}

/**
 * Clear `deleted_at` and bring the product back with the status it had before
 * (Draft, Published or Archived).
 */
export function restoreTrashedProduct(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/restore`, { method: "POST" });
}

/**
 * The only destructive call. The server only accepts it from the Trash and
 * only when `confirmation` is the exact word "DELETE".
 */
export function permanentlyDeleteProduct(id, confirmation = "DELETE") {
  return request(`/api/admin/products/${encodeURIComponent(id)}/permanent`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: confirmation }),
  });
}

// ========================================================
// REVIEWS
// --------------------------------------------------------
// The review moderation endpoints. These go through the same
// `request` helper, so the admin session cookie is always sent
// and an expired session surfaces as error.code === "AUTH_REQUIRED".
// ========================================================

/**
 * List reviews for the admin Reviews page — both real customer reviews and
 * the owner's own editorial testimonials.
 *
 * `status` accepts "draft" | "pending" | "approved" | "rejected" | "hidden" |
 * "archived" (or nothing for all). `source` accepts "customer" | "admin" (or
 * nothing for both). `search` matches customer, email, order number, product
 * or review text.
 */
export function listAdminReviews(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/reviews${query.toString() ? `?${query}` : ""}`);
}

/** Cheap per-status and per-source totals for the admin header badge + tabs. */
export function getAdminReviewCounts() {
  return request("/api/admin/reviews/counts");
}

/**
 * Write an editorial testimonial.
 *
 * The server decides everything that matters: the review is always stored as
 * source = 'admin', is never marked as a verified purchase, and is attached to
 * no order, so it can never be mistaken for a customer review or consume a
 * customer's one-review-per-item allowance. `status` defaults to "draft".
 */
export function createAdminReview(review) {
  return request("/api/admin/reviews", {
    method: "POST",
    body: JSON.stringify(review),
  });
}

/**
 * Move a review between moderation states: publish, hide, reject, archive,
 * restore or send back to draft. The server re-syncs the product rating from
 * the approved CUSTOMER reviews afterwards, so a testimonial never changes a
 * product's star rating.
 */
export function updateAdminReviewStatus(id, status) {
  return request(`/api/admin/reviews/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** Delete an inappropriate review for good. */
export function deleteAdminReview(id) {
  return request(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ========================================================
// ORDERS
// --------------------------------------------------------
// The owner marks a real order as delivered, which is what opens
// the customer's ability to review the products they bought.
// ========================================================

/** Recent orders with their fulfilment status and how many lines are reviewed. */
export function listAdminOrders(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/orders${query.toString() ? `?${query}` : ""}`);
}

/**
 * Move an order to a new fulfilment state. "delivered" is the important one:
 * it is what lets the customer review what they bought.
 */
export function updateAdminOrderStatus(orderNumber, status) {
  return request(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
