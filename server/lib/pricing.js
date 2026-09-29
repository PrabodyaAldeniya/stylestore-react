/* ========================================================
   PRODUCT PRICE RULES (SERVER)
   --------------------------------------------------------
   Mirrors src/lib/pricing.js so backend validation, repository
   calculations and frontend forms agree on every price decision:

     * numeric conversion without text comparison
     * current selling price is required and positive
     * original price is optional
     * original price may equal selling price (no discount, discount = 0)
     * original price higher than selling price creates a discount
     * original price lower than selling price is rejected
   ======================================================== */

export const MAX_PRICE = 99_999_999;

export const ORIGINAL_PRICE_LOWER_MESSAGE =
  "Original price cannot be lower than the selling price.";

const PRICE_TOO_LARGE_MESSAGE = "That price is too large. Use a number under 100,000,000.";

/**
 * Convert any price input or payload value into a finite number, or null.
 */
export function toPriceNumber(value) {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : value;
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/**
 * Valid price greater than zero.
 */
export function parsePriceInput(value) {
  const number = toPriceNumber(value);
  return number !== null && number > 0 ? number : null;
}

/**
 * Calculate discount percentage.
 * original > selling -> discount %
 * original <= selling -> 0
 */
export function calculateDiscountPercent(price, originalPrice) {
  const current = toPriceNumber(price);
  const original = toPriceNumber(originalPrice);
  if (current === null || original === null) return 0;
  if (current <= 0 || original <= 0) return 0;
  if (original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

export function hasRealDiscount(price, originalPrice) {
  return calculateDiscountPercent(price, originalPrice) > 0;
}

export function originalPriceForDisplay(price, originalPrice) {
  if (!hasRealDiscount(price, originalPrice)) return null;
  const number = toPriceNumber(originalPrice);
  return number === null ? null : Math.round(number * 100) / 100;
}

export function validatePrices(priceValue, originalPriceValue) {
  const errors = {};

  const priceText = String(priceValue ?? "").trim();
  const price = toPriceNumber(priceText);
  if (priceText === "") {
    errors.price = "Enter the current selling price.";
  } else if (price === null || price <= 0) {
    errors.price = "Enter a valid price greater than zero.";
  } else if (price > MAX_PRICE) {
    errors.price = PRICE_TOO_LARGE_MESSAGE;
  }

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
