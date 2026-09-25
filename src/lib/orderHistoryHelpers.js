/* ========================================
   ORDER HISTORY — shared helpers
   --------------------------------------------------------
   Small, presentation-only helpers reused across the
   order history components: the localStorage key, date
   formatting, product image lookup and colour detection.
   ======================================== */
import products from "../data/products";

/* ========================================
   2. CONSTANTS
======================================== */
export const ORDER_NUMBERS_KEY = "stylestore_order_numbers";

/* ========================================
   3. DATE FORMATTING
======================================== */
// MySQL returns an ISO date string; show it as a friendly local time
// (e.g. "25 Sep 2026, 14:24"). Falls back to the raw value if unparsable.
export function formatOrderDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/* ========================================
   4. PRODUCT IMAGE LOOKUP
======================================== */
// Order items carry only a product id; look the catalogue image up by id so
// cards can show the real product photo when one exists.
export function getProductImage(productId) {
  const product = products.find((entry) => String(entry.id) === String(productId));
  return product?.image || "";
}

/* ========================================
   5. COLOUR DETECTION
======================================== */
// Colours stored with an order are usually hex swatches (e.g. "#d9a066").
// When true the UI shows a colour dot; otherwise it shows the text value.
export function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || ""));
}