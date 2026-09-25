/* ========================================
   ORDER HISTORY — localStorage persistence
   --------------------------------------------------------
   Guest order history works by saving ONLY the order
   numbers created from this browser (no addresses, emails
   or order details). Every successful checkout adds the
   returned order number here, and clearing the shopping
   bag never touches this key.
   ======================================== */
import { ORDER_NUMBERS_KEY } from "./orderHistoryHelpers";

/* ========================================
   2. CORE STORAGE HELPERS
======================================== */

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_NUMBERS_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((entry) => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRaw(orderNumbers) {
  try {
    localStorage.setItem(ORDER_NUMBERS_KEY, JSON.stringify(orderNumbers));
  } catch {
    // localStorage can be unavailable (private mode) — history simply
    // won't persist, but nothing else crashes.
  }
}

/* ========================================
   3. PUBLIC API
======================================== */

// Read the stored order numbers, deduplicated and trimmed.
export function getStoredOrderNumbers() {
  return [...new Set(readRaw().map((entry) => entry.trim()).filter(Boolean))];
}

// Check whether any order numbers are stored at all.
export function hasStoredOrderNumbers() {
  return getStoredOrderNumbers().length > 0;
}

// Add one order number to the saved list, preserving existing entries and
// never creating duplicates. Standalone so it can be called from checkout,
// the success page and anywhere else that receives a fresh order number.
export function addOrderNumber(orderNumber) {
  const value = String(orderNumber || "").trim();
  if (!value) return getStoredOrderNumbers();
  const current = getStoredOrderNumbers();
  if (current.includes(value)) return current;
  const nextNumbers = [...current, value];
  writeRaw(nextNumbers);
  return nextNumbers;
}