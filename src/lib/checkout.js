/* ========================================
   CHECKOUT CONFIGURATION
   Display-side rules only. The final authority
   for pricing is the backend (server/data/products.js
   + server/routes/orders.js) — the server always
   recalculates subtotal, discount, shipping and total
   and never trusts what the browser sends.
   ======================================== */
import { formatLKR } from "../format";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export const DELIVERY_METHODS = {
  standard: { id: "standard", label: "Standard Delivery", fee: 650, eta: "3–5 working days" },
  express: { id: "express", label: "Express Delivery", fee: 1900, eta: "1–2 working days" },
};

export const PAYMENT_METHODS = {
  cod: {
    id: "cod",
    label: "Cash on Delivery",
    detail: "Pay in cash when your order is delivered.",
  },
  bank_deposit: {
    id: "bank_deposit",
    label: "Bank Deposit",
    detail: "Deposit to our bank account after placing the order.",
  },
};

export const FREE_DELIVERY_THRESHOLD = 10000;

export const COUNTRIES = [
  "Sri Lanka",
  "India",
  "Maldives",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Canada",
  "Germany",
];

export const DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Galle",
  "Matara",
  "Hambantota",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Monaragala",
  "Ratnapura",
  "Kegalle",
];

export function shippingLabel(shipping) {
  return shipping === 0 ? "Free" : formatLKR(shipping);
}

// Client-side preview of the discount — the server is still authoritative.
export function previewDiscount(percentOff, subtotal) {
  if (!percentOff || percentOff <= 0) return 0;
  return Math.round((subtotal * Math.min(Number(percentOff), 50)) / 100);
}