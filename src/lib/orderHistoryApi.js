/* ========================================
   ORDER HISTORY API HELPERS
   --------------------------------------------------------
   Thin fetch wrappers around the backend order-history
   endpoints. The backend re-validates every order number,
   so malformed or non-existent orders are simply left out
   of the response.
   ======================================== */

/* ========================================
   2. CONSTANTS AND SHARED REQUEST HELPER
======================================== */
import { API_BASE } from "./checkout";

async function request(path, { method = "GET", body } = {}) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    // Network / server unreachable — the caller shows a connection error.
    return { ok: false, status: 0, data: {} };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { ok: response.ok, status: response.status, data };
}

/* ========================================
   3. API REQUESTS
======================================== */

// Fetch the real orders matching the stored order numbers (newest first).
export async function fetchOrderHistory(orderNumbers) {
  return request("/api/orders/history", {
    method: "POST",
    body: { orderNumbers },
  });
}

// Look up a single order on a new device using its number + checkout email.
export async function lookupOrder(orderNumber, email) {
  return request("/api/orders/lookup", {
    method: "POST",
    body: { orderNumber, email },
  });
}