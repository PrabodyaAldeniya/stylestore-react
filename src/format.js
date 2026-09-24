/* ========================================
   PRICE FORMATTING (Sri Lankan Rupees)
   Prices in the data file are whole LKR
   amounts (e.g. 7800 => LKR 7,800).
======================================== */
export const FREE_DELIVERY_THRESHOLD = 10000;

export function formatLKR(value) {
  return "LKR " + Math.round(value).toLocaleString("en-LK");
}