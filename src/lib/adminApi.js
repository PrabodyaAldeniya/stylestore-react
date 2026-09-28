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

/** Products currently in the Trash (soft deleted, still restorable). */
export function listTrashedProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/api/admin/products/trash${query.toString() ? `?${query}` : ""}`);
}

export function getAdminCatalogueMeta() {
  return request("/api/admin/products/meta");
}

export function getAdminProduct(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}`);
}

export function createAdminProduct(formData) {
  return request("/api/admin/products", { method: "POST", body: formData });
}

export function updateAdminProduct(id, formData) {
  return request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: formData,
  });
}

export function updateAdminProductStatus(id, status) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function setAdminProductPrimaryImage(id, imageId) {
  return request(
    `/api/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}/primary`,
    { method: "PATCH" }
  );
}

export function deleteAdminProductImage(id, imageId) {
  return request(
    `/api/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" }
  );
}

/**
 * Soft delete — the "Delete" button in the admin product list. The product is
 * moved to the Trash: hidden from the store, fully restorable, and its database
 * record and uploaded images are left untouched.
 */
export function moveProductToTrash(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/trash`, { method: "POST" });
}

/**
 * Clear `deleted_at` and bring the product back with the status it had before
 * (Draft, Published or Archived).
 */
export function restoreTrashedProduct(id) {
  return request(`/api/admin/products/${encodeURIComponent(id)}/restore`, { method: "POST" });
}

/**
 * The only destructive call. The server only accepts it from the Trash and
 * only when `confirmation` is the exact word "DELETE".
 */
export function permanentlyDeleteProduct(id, confirmation = "DELETE") {
  return request(`/api/admin/products/${encodeURIComponent(id)}/permanent`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: confirmation }),
  });
}
