import { API_BASE } from "./checkout";

function assetUrl(path) {
  if (!path) return "";
  if (/^(?:https?:|data:|javascript:|\/\/)/i.test(path)) return "";
  if (API_BASE && path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

export function normalizeProduct(product) {
  const colours = Array.isArray(product.colours) ? product.colours : [];
  const images = Array.isArray(product.images) ? product.images : [];
  const image = assetUrl(images[0]?.path || product.image || "");
  return {
    ...product,
    image,
    images: images.map((item) => ({ ...item, url: assetUrl(item.path || item.url) })),
    oldPrice: product.originalPrice ?? null,
    colors: colours.map((colour) => colour.hex).filter(Boolean),
    colorOptions: colours,
    featured: Boolean(product.isFeatured),
    stock: Number(product.stockQuantity || 0),
    isOutOfStock: Number(product.stockQuantity || 0) <= 0,
  };
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("The catalogue service is unavailable. Check that the API is running.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || "The catalogue could not be loaded.");
  }
  return data;
}

export async function fetchProducts({ pageSize = 100, search = "", category = "", sort = "newest" } = {}) {
  const params = new URLSearchParams({ pageSize: String(pageSize), sort });
  if (search) params.set("search", search);
  if (category && category !== "All") params.set("category", category);
  const products = [];
  let result = { products: [], total: 0, hasMore: false };
  for (let page = 1; page <= 100; page += 1) {
    params.set("page", String(page));
    const data = await request(`/api/products?${params.toString()}`);
    products.push(...(data.products || []));
    result = data;
    if (!data.hasMore) break;
  }
  return { ...result, page: 1, products: products.map(normalizeProduct) };
}

export async function fetchProduct(id) {
  const data = await request(`/api/products/${encodeURIComponent(id)}`);
  return normalizeProduct(data.product);
}

export { assetUrl };
