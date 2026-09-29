/* ========================================================
   CUSTOMER REVIEW API HELPERS
   --------------------------------------------------------
   Thin wrappers around the public review endpoints.

   Every response the backend sends here is already privacy-safe:
   it contains a first name + last initial, a rating, the text,
   the product name and the date. It never contains an email
   address, an order number or a database id, and the backend only
   ever returns published (approved) reviews.

   Errors are thrown with `.code` and `.fields` so a form can
   highlight the exact field that needs fixing.
   ======================================================== */
import { API_BASE } from "./checkout";

async function request(path, { method = "GET", body } = {}) {
  const options = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw reviewError(
      "UNAVAILABLE",
      "The review service is unavailable. Check that the API is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw reviewError(
      data.code || "REVIEW_ERROR",
      data.message || "The review could not be completed.",
      data.fields
    );
  }
  return data;
}

function reviewError(code, message, fields) {
  const error = new Error(message);
  error.code = code;
  error.fields = fields;
  return error;
}

/** Approved reviews for the homepage / reviews section, newest first. */
export function fetchApprovedReviews({ limit = 12 } = {}) {
  return request(`/api/reviews?limit=${encodeURIComponent(limit)}`);
}

/** Approved reviews + average rating / count for one product. */
export function fetchProductReviews(productId) {
  return request(`/api/products/${encodeURIComponent(productId)}/reviews`);
}

/**
 * Step 1 of the review form. Returns only the products inside the order that
 * the order number + email belong to, so a customer can never be offered a
 * product they did not buy.
 *
 * The response also says whether the order has been DELIVERED. Until it has,
 * every item comes back with `reviewable: false` and the order cannot be
 * reviewed at all — that rule is enforced on the server, this flag only lets
 * the form explain it.
 */
export function verifyOrderForReview(orderNumber, email) {
  return request("/api/reviews/verify", {
    method: "POST",
    body: { orderNumber, email },
  });
}

/**
 * Step 2. The backend re-checks the order itself and, once every check passes,
 * stores the review as approved and publishes it immediately.
 *
 * Only the order number, the email and the product id are sent. The order line
 * being reviewed is resolved on the server, so a customer cannot tamper with
 * it and never sees an internal id.
 */
export function submitReview(payload) {
  return request("/api/reviews", { method: "POST", body: payload });
}

/** Fired after a review is published, so open review lists can refresh. */
export { reviewError };
