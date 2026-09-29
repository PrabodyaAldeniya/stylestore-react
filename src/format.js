/* ========================================
   PRICE FORMATTING (Sri Lankan Rupees)
   Prices in the data file are whole LKR
   amounts (e.g. 7800 => Rs. 7,800).
   Display-only: database & API values stay
   numeric — only the rendered text changes.
======================================== */
export const FREE_DELIVERY_THRESHOLD = 10000;

export function formatLKR(value) {
  // A blank, broken or negative amount is never allowed to reach the page as
  // "Rs. NaN", "Rs. undefined" or "Rs. -500". It falls back to zero here, and
  // the caller is expected to show its own empty state instead of formatting
  // a price the owner has not entered yet. Real prices are unaffected.
  const amount = Number(value);
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return "Rs. " + Math.round(safe).toLocaleString("en-LK");
}