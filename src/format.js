/* ========================================
   PRICE FORMATTING (Sri Lankan Rupees)
   Prices in the data file are whole LKR
   amounts (e.g. 7800 => Rs. 7,800).
   Display-only: database & API values stay
   numeric — only the rendered text changes.
======================================== */
export const FREE_DELIVERY_THRESHOLD = 10000;

export function formatLKR(value) {
  return "Rs. " + Math.round(value).toLocaleString("en-LK");
}