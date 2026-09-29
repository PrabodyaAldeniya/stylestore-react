// ========================================
// REVIEW VALIDATION
// --------------------------------------------------------
// All input checking for the review system lives here, so the public
// POST /api/reviews route and the admin routes can never disagree
// about what a valid review is.
//
// Rules enforced here:
//   * the order number must look like a real StyleStore number
//   * the email must be a syntactically valid address
//   * the display name must be letters only (so a customer can
//     never park an email address or a link in their "name")
//   * the rating must be a whole number from 1 to 5
//   * the title is optional, the message is required
//   * both are hard length-capped
//   * obvious spam (honeypot, link farms, keyboard mashing) is
//     rejected before anything touches the database
//
// Two kinds of review exist and they are never confused:
//
//   CUSTOMER  — written by a shopper, tied to one order line of a
//               delivered order, auto-published, and always
//               "Verified Buyer". The order number and email are
//               required and are the proof of purchase.
//   ADMIN     — an editorial testimonial written by the store
//               owner. It has no order, no email, is never
//               "Verified Buyer", and the owner picks its status
//               (draft / approved / hidden) on the admin page.
// ========================================

// The order status a customer order must reach before any of its
// products can be reviewed. A single source of truth, imported by the
// repository as well.
export const DELIVERED_ORDER_STATUS = "delivered";

// Every status a review can be in. Only 'approved' is ever public.
//
//   draft    — admin wrote it, not published yet
//   pending  — customer review waiting on moderation
//   approved — visible on the site
//   rejected — refused, kept for the record
//   hidden   — was published, pulled from the site without being
//              treated as spam
//   archived — deliberately retired, can be brought back
export const REVIEW_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "hidden",
  "archived",
];

// The statuses the admin moderation dropdown offers.
export const MODERATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "hidden",
  "archived",
];

// Where a review came from. This is what decides whether a review
// counts towards a product's star rating, and what badge it shows.
export const REVIEW_SOURCES = ["customer", "admin"];

// The public badge text. Kept here so the API and any future email
// or receipt read from exactly the same place.
export const REVIEW_SOURCE_LABELS = {
  customer: "Verified Buyer",
  admin: "StyleStore Testimonial",
};

export const MAX_NAME_LENGTH = 80;
export const MAX_TITLE_LENGTH = 160;
export const MAX_TEXT_LENGTH = 2000;
export const MIN_TEXT_LENGTH = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Same shape the checkout API generates: SS-YYYYMMDD-XXXXX
const ORDER_NUMBER_PATTERN = /^SS-\d{8}-[A-Z0-9]{5}$/;

// Letters (any script), marks, apostrophes and hyphens only. This is what
// stops someone from putting an email address or a URL in the name field.
const NAME_PATTERN = /^[\p{L}\p{M}' -]{2,80}$/u;

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){9,}/;

function text(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim();
}

/** Collapse runs of whitespace but keep the author's line breaks intact. */
function normalise(value, maxLength) {
  return text(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function reviewError(message, code, status = 400, fields) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (fields) error.fields = fields;
  return error;
}

export function parseReviewId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw reviewError("Review ID must be a positive integer.", "VALIDATION_ERROR", 422);
  }
  return id;
}

export function parseProductId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw reviewError("Product ID must be a positive integer.", "VALIDATION_ERROR", 422);
  }
  return id;
}

export function parseReviewStatus(value) {
  const status = text(value).toLowerCase();
  if (!MODERATION_STATUSES.includes(status)) {
    throw reviewError(
      `Status must be one of: ${MODERATION_STATUSES.join(", ")}.`,
      "VALIDATION_ERROR",
      422
    );
  }
  return status;
}

export function parseReviewSource(value) {
  const source = text(value).toLowerCase();
  if (!REVIEW_SOURCES.includes(source)) {
    throw reviewError("Source must be customer or admin.", "VALIDATION_ERROR", 422);
  }
  return source;
}

/**
 * Cheap spam gate. A genuine review is prose about a garment, so a body full
 * of links, a phone number or one character hammered 40 times is refused
 * before the order lookup even runs.
 */
export function findSpamReason(body = {}) {
  // Hidden field real users never see. Bots fill in every input they find.
  if (text(body.website)) return "honeypot";

  const reviewText = normalise(body.reviewText, MAX_TEXT_LENGTH);
  const reviewTitle = normalise(body.reviewTitle, MAX_TITLE_LENGTH);
  // Links are counted across the title and the body together, so a spammer
  // cannot split one link between them to stay under the limit.
  const combined = `${reviewTitle}\n${reviewText}`;

  if ((combined.match(URL_PATTERN) || []).length >= 2) return "links";
  if (PHONE_PATTERN.test(reviewText)) return "phone";
  if (/(.)\1{39,}/.test(reviewText)) return "repetition";

  const repeats = new Map();
  for (const word of reviewText.toLowerCase().split(/\W+/).filter(Boolean)) {
    repeats.set(word, (repeats.get(word) || 0) + 1);
  }
  const words = [...repeats.values()];
  // Ten words or fewer where one word is repeated three times is mashing.
  if (words.length <= 10 && Math.max(0, ...words) >= 3) return "repetition";

  return null;
}

/**
 * Validate the customer-facing review form. The order number and email are
 * only format-checked here — the real proof of purchase is the database
 * lookup in repositories/reviews.js.
 */
export function validateReviewSubmission(body = {}) {
  const errors = {};
  const value = {};

  const orderNumber = text(body.orderNumber).toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    errors.orderNumber = "Enter a valid order number, e.g. SS-20250101-AB12C.";
  } else {
    value.orderNumber = orderNumber;
  }

  const email = text(body.email).toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter the email address you used at checkout.";
  } else {
    value.email = email;
  }

  const productId = Number(text(body.productId));
  if (!Number.isInteger(productId) || productId < 1) {
    errors.productId = "Choose the product you are reviewing.";
  } else {
    value.productId = productId;
  }

  const customerName = normalise(body.customerName, MAX_NAME_LENGTH);
  if (!NAME_PATTERN.test(customerName)) {
    errors.customerName =
      "Enter the name you would like shown (letters, spaces, ' and - only).";
  } else {
    value.customerName = customerName;
  }

  // Accept "4" and 4, but never 4.5, "4/5" or 0.
  const rawRating = text(body.rating);
  const rating = /^\d+$/.test(rawRating) ? Number(rawRating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Choose a rating from 1 to 5 stars.";
  } else {
    value.rating = rating;
  }

  const reviewTitle = normalise(body.reviewTitle, MAX_TITLE_LENGTH);
  if (reviewTitle) value.reviewTitle = reviewTitle;

  const reviewText = normalise(body.reviewText, MAX_TEXT_LENGTH);
  if (reviewText.length < MIN_TEXT_LENGTH) {
    errors.reviewText = `Please write at least ${MIN_TEXT_LENGTH} characters about your purchase.`;
  } else if (text(body.reviewText).length > MAX_TEXT_LENGTH) {
    errors.reviewText = `Please keep your review under ${MAX_TEXT_LENGTH} characters.`;
  } else {
    value.reviewText = reviewText;
  }

  if (Object.keys(errors).length) {
    throw reviewError("Please check the review form.", "VALIDATION_ERROR", 422, errors);
  }
  return value;
}

/**
 * Validate the admin "write a review" form.
 *
 * An admin review is always source = 'admin', so it can never be
 * marked as a verified purchase and can never be attached to an
 * order. The owner chooses which product it belongs to and which
 * moderation state to start in (draft is the safe default so a
 * half-written testimonial is never published by accident).
 */
export function validateAdminReviewSubmission(body = {}) {
  const errors = {};
  const value = {};

  const productId = Number(text(body.productId));
  if (!Number.isInteger(productId) || productId < 1) {
    errors.productId = "Choose the product this testimonial is about.";
  } else {
    value.productId = productId;
  }

  // The display name on an admin review is the author, e.g. "StyleStore Team".
  const customerName = normalise(body.customerName, MAX_NAME_LENGTH);
  if (!customerName) {
    errors.customerName = "Enter the name to show, e.g. StyleStore Team.";
  } else if (!NAME_PATTERN.test(customerName)) {
    errors.customerName =
      "Use letters, spaces, ' and - only (no links or email addresses).";
  } else {
    value.customerName = customerName;
  }

  const rawRating = text(body.rating);
  const rating = /^\d+$/.test(rawRating) ? Number(rawRating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Choose a rating from 1 to 5 stars.";
  } else {
    value.rating = rating;
  }

  const reviewTitle = normalise(body.reviewTitle, MAX_TITLE_LENGTH);
  if (reviewTitle) value.reviewTitle = reviewTitle;

  const reviewText = normalise(body.reviewText, MAX_TEXT_LENGTH);
  if (reviewText.length < MIN_TEXT_LENGTH) {
    errors.reviewText = `Please write at least ${MIN_TEXT_LENGTH} characters.`;
  } else if (text(body.reviewText).length > MAX_TEXT_LENGTH) {
    errors.reviewText = `Please keep this under ${MAX_TEXT_LENGTH} characters.`;
  } else {
    value.reviewText = reviewText;
  }

  // Default to draft: an admin review is published deliberately.
  const requestedStatus = text(body.status).toLowerCase();
  if (requestedStatus) {
    if (!MODERATION_STATUSES.includes(requestedStatus)) {
      errors.status = "Choose a valid status.";
    } else {
      value.status = requestedStatus;
    }
  } else {
    value.status = "draft";
  }

  if (Object.keys(errors).length) {
    throw reviewError("Please check the review form.", "VALIDATION_ERROR", 422, errors);
  }
  return value;
}

/**
 * The public, privacy-safe version of a review.
 *
 * The customer's email address, the order number and the internal review id
 * are deliberately absent: this object is sent to every visitor. `name` is
 * reduced to a first name plus last initial, which is a recognisable but safe
 * display format.
 */
export function toPublicName(name) {
  const parts = text(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "StyleStore customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export { ORDER_NUMBER_PATTERN };
