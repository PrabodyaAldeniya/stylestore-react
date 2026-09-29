/* ========================================================
   PRODUCT API HELPER
   --------------------------------------------------------
   Every call the storefront makes to GET /api/products goes
   through this file, so the URL building and the response
   shape live in exactly one place.

   Two ways of reading the catalogue:

   1. fetchProducts()      — downloads EVERY published product
                             (used by the home page, which needs the
                             whole collection for its category links).

   2. searchProducts()     — one request, done by the database,
                             with a search term and filters. This is
                             the one the navbar search box uses, so
                             the search happens in MySQL and the
                             server decides what matches.

   Nothing is ever built with string concatenation: the query
   parameters go through URLSearchParams, and the server binds them
   as `?` placeholders in parameterised SQL.
   ======================================================== */
import { API_BASE } from "./checkout";
import { originalPriceForDisplay } from "./pricing";

/* ========================================================
   1. ASSET AND PRODUCT SHAPE HELPERS
   ======================================================== */
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
    oldPrice: originalPriceForDisplay(product.price, product.originalPrice),
    colors: colours.map((colour) => colour.hex).filter(Boolean),
    colorOptions: colours,
    featured: Boolean(product.isFeatured),
    stock: Number(product.stockQuantity || 0),
    isOutOfStock: Number(product.stockQuantity || 0) <= 0,
  };
}

/* ========================================================
   2. LOW-LEVEL REQUEST
   ======================================================== */
async function request(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    // An aborted request is not a failure — the caller already moved on.
    if (error?.name === "AbortError") throw error;
    throw new Error("The catalogue service is unavailable. Check that the API is running.", {
      cause: error,
    });
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

/* ========================================================
   3. QUERY STRING BUILDER
   --------------------------------------------------------
   Only non-empty values are added, so the URL always stays short
   and a blank filter never narrows the results.
   ======================================================== */
function buildProductQuery({
  page = 1,
  pageSize = 24,
  search = "",
  category = "",
  productType = "",
  sort = "newest",
  minPrice = "",
  maxPrice = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (sort) params.set("sort", sort);
  if (search) params.set("search", search);
  if (category && category !== "All") params.set("category", category);
  if (productType && productType !== "all") params.set("productType", productType);
  if (minPrice !== "" && minPrice !== null && minPrice !== undefined) {
    params.set("minPrice", String(minPrice));
  }
  if (maxPrice !== "" && maxPrice !== null && maxPrice !== undefined) {
    params.set("maxPrice", String(maxPrice));
  }
  return params;
}

/* ========================================================
   4. DATABASE-BACKED PRODUCT SEARCH
   --------------------------------------------------------
   Used by the /products catalogue page. One request per page of
   results; the database does the matching, so a search never has to
   download the whole catalogue first.
   ======================================================== */
export async function searchProducts(options = {}, { signal } = {}) {
  const params = buildProductQuery(options);
  const data = await request(`/api/products?${params.toString()}`, { signal });
  return {
    products: (data.products || []).map(normalizeProduct),
    total: Number(data.total || 0),
    page: Number(data.page || 1),
    pageSize: Number(data.pageSize || 24),
    hasMore: Boolean(data.hasMore),
    // The server echoes back the cleaned search term it actually used.
    search: data.search || "",
  };
}

/* ========================================================
   5. WHOLE-CATALOGUE READ (home page)
   --------------------------------------------------------
   Kept exactly as it was: the home page needs every published
   product in memory for its category showcase and client-side
   category switching.
   ======================================================== */
export async function fetchProducts({
  pageSize = 100,
  search = "",
  category = "",
  productType = "",
  sort = "newest",
} = {}) {
  const params = new URLSearchParams({ pageSize: String(pageSize), sort });
  if (search) params.set("search", search);
  if (category && category !== "All") params.set("category", category);
  if (productType && productType !== "all") params.set("productType", productType);
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

/** Category → product-type navigation for the catalogue filter bar. */
export async function fetchProductFacets() {
  const data = await request("/api/products/facets");
  return data.categories || [];
}

export { assetUrl, buildProductQuery };
