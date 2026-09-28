import { API_BASE } from "./checkout";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.message || "The admin request could not be completed.");
    error.code = data.code;
    error.fields = data.fields;
    throw error;
  }
  return data;
}

export function getAdminSession() {
  return request("/api/auth/me");
}

export function loginAdmin(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutAdmin() {
  return request("/api/auth/logout", { method: "POST" });
}

export function listAdminProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/products${query.toString() ? `?${query}` : ""}`);
}

export function createAdminProduct(formData) {
  return request("/api/admin/products", { method: "POST", body: formData });
}

export function updateAdminProduct(id, formData) {
  return request(`/api/admin/products/${id}`, { method: "PUT", body: formData });
}

export function updateAdminProductStatus(id, status) {
  return request(`/api/admin/products/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminProduct(id) {
  return request(`/api/admin/products/${id}`, { method: "DELETE" });
}
