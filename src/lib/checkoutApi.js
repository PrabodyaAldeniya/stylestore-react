/* ========================================
   CHECKOUT API HELPERS
   Thin fetch wrappers around the backend.
   The backend recalculates every total, so the
   frontend never sends prices that are trusted.
   ======================================== */
import { API_BASE } from "./checkout";

async function request(path, { method = "GET", body } = {}) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}${path}`, options);
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { ok: response.ok, status: response.status, data };
}

export async function validateDiscount(code, email = "") {
  return request("/api/orders/discount-code", {
    method: "POST",
    body: { code, email },
  });
}

export async function placeOrder(payload) {
  return request("/api/orders", {
    method: "POST",
    body: payload,
  });
}

export async function fetchOrder(orderNumber) {
  return request(`/api/orders/${encodeURIComponent(orderNumber)}`);
}