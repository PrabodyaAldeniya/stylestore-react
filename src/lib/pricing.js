/* ========================================================
   PRODUCT PRICE RULES
   --------------------------------------------------------
   One module owns every price decision in the admin form,
   the preview and the storefront, so Add Product, Edit
   Product, the preview dialog and the public cards can
   never disagree:

     * a price is only ever a real NUMBER above zero, so a
       numeric string such as "3500" is converted safely and
       never compared as text;
     * the current selling price is required;
     * the original price is OPTIONAL;
     * the original price MAY EQUAL the selling price —
       equal prices simply mean the product has no
       discount, so nothing is rejected, no badge is shown
       and only the normal selling price is displayed;
     * only an original price HIGHER than the selling price
       is a discount, and only then is a percentage worked
       out and a sale badge allowed;
     * an original price LOWER than the selling price is
       the one rejected case.

   The API (server/validation/product.js) enforces the same
   rules, so bypassing this form cannot save a product the
   storefront would have to reject.

   Prices stay numeric in the database, the API and this
   module — only rendered text is formatted, and that is the
   one job of ../format.js.
   ======================================================== */

export const MAX_PRICE = 99_999_999;

// The single wording used for a rejected original price, in the admin form
// and in the API's 422 response body.
export const ORIGINAL_PRICE_LOWER_MESSAGE =
  "Original price cannot be lower than the selling price.";

const PRICE_TOO_LARGE_MESSAGE = "That price is too large. Use a number under 100,000,000.";

/**
 * Turn anything a price box, a form field or an API payload can hold into a
 * real number. Returns null for a blank box, a non-numeric value or anything
 * that is not finite, so a half-typed price can never be compared as text
 * ("900" vs "1000") or rendered as "Rs. NaN".
 */
export function toPriceNumber(value) {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : value;
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/**
 * A price the shop is allowed to charge and to display: a real number above
 * zero. Everything else — blank, "abc", 0, a negative amount — is null, which
 * is exactly what the empty states in the form check for.
 */
export function parsePriceInput(value) {
  const number = toPriceNumber(value);
  return number !== null && number > 0 ? number : null;
}

/**
 * The discount as a whole percentage, worked out only when the original price
 * is genuinely higher than the selling price.
 *
 *   original > selling -> the discount
 *   original = selling -> 0  (the product is simply not reduced)
 *   original blank     -> 0
 *   anything else      -> 0
 *
 * 0 is the answer for "no discount", so a "0% OFF" badge can never be built
 * from it — every badge in the app is guarded on a percentage above zero.
 */
export function calculateDiscountPercent(price, originalPrice) {
  const current = toPriceNumber(price);
  const original = toPriceNumber(originalPrice);
  if (current === null || original === null) return 0;
  if (current <= 0 || original <= 0) return 0;
  if (original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

/** True only when there is a discount worth showing. */
export function hasRealDiscount(price, originalPrice) {
  return calculateDiscountPercent(price, originalPrice) > 0;
}

/**
 * The original price to render next to the selling price, or null when it must
 * not be rendered at all.
 *
 * Returning null for equal prices is what stops a crossed-out duplicate
 * ("Rs. 3,500  Rs. 3,500") reaching a product card or Quick View. The stored
 * `originalPrice` itself is never changed — only what is displayed.
 */
export function originalPriceForDisplay(price, originalPrice) {
  if (!hasRealDiscount(price, originalPrice)) return null;
  const number = toPriceNumber(originalPrice);
  return number === null ? null : Math.round(number * 100) / 100;
}

/**
 * The Add/Edit Product price rules, in one place so the two screens can never
 * drift apart. Returns `{ price?: string, originalPrice?: string }` — an empty
 * object means the pair is valid.
 */
export function validatePrices(priceValue, originalPriceValue) {
  const errors = {};

  // ---- Current selling price: required, numeric, greater than zero -------
  const priceText = String(priceValue ?? "").trim();
  const price = toPriceNumber(priceText);
  if (priceText === "") {
    errors.price = "Enter the current selling price.";
  } else if (price === null || price <= 0) {
    errors.price = "Enter a valid price greater than zero.";
  } else if (price > MAX_PRICE) {
    errors.price = PRICE_TOO_LARGE_MESSAGE;
  }

  // ---- Original price: optional, numeric, never below the selling price --
  // Equal is explicitly allowed. The selling price itself has to be usable
  // before the two can be compared, and when it is not, its own error is
  // already on screen, so the comparison is simply skipped for now.
  const originalText = String(originalPriceValue ?? "").trim();
  const original = toPriceNumber(originalText);
  if (originalText !== "") {
    if (original === null || original === 0) {
      errors.originalPrice = "Enter a valid price greater than zero.";
    } else if (original < 0) {
      errors.originalPrice = "Original price cannot be negative.";
    } else if (original > MAX_PRICE) {
      errors.originalPrice = PRICE_TOO_LARGE_MESSAGE;
    } else if (!errors.price && price !== null && original < price) {
      errors.originalPrice = ORIGINAL_PRICE_LOWER_MESSAGE;
    }
  }

  return errors;
}
