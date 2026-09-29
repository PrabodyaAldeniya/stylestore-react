/* ========================================================
   ADMIN CATALOGUE TAXONOMY
   --------------------------------------------------------
   One shared source of truth for the beginner-friendly
   product form. The backend accepts any category/type
   string, so these lists are suggestions — the admin UI
   always merges in whatever product types already exist
   in the database so older products stay editable.
   ======================================================== */

export const MAIN_CATEGORIES = ["Women", "Men", "Kids", "Accessories"];

export const RECOMMENDED_PRODUCT_TYPES = {
  Women: [
    "Dresses",
    "Frocks",
    "Blouses",
    "Tops",
    "Skirts",
    "Trousers",
    "Jackets",
    "Sarees",
    "Casual Wear",
    "Office Wear",
    "Co-Ord Sets",
    "Two Piece Sets",
    // Types used by the initial catalogue seed (npm run seed:products).
    // Appended, never in front of the list above, so products created
    // before these were added keep their existing position and value.
    "Dress",
    "Blouse",
    "Top",
    "Skirt",
    "Trouser",
    "Shirt",
  ],
  Men: [
    "Shirts",
    "T-Shirts",
    "Trousers",
    "Jackets",
    "Formal Wear",
    "Casual Wear",
    "Polo Shirts",
    "Ethnic Wear",
    "Two Piece Sets",
    "T-Shirt",
    "Trouser",
    "Shirt",
  ],
  Kids: [
    "Kids Wear",
    "Girls Dresses",
    "Girls Tops",
    "Girls Trousers",
    "Girls Skirts",
    "Girls Party Wear",
    "Boys Shirts",
    "Boys T-Shirts",
    "Boys Trousers",
    "Boys Jackets",
    "Baby Rompers",
    "Baby Bodysuits",
    "Baby Sets",
    "Unisex Wear",
    "Kids Dress",
    "Kids T-Shirt",
    "Kids Shorts",
    "Kids Jacket",
    "Kids Joggers",
    "Baby Set",
  ],
  Accessories: [
    "Bags",
    "Footwear",
    "Jewellery",
    "Belts",
    "Scarves",
    "Caps",
    "Sunglasses",
    "Watches",
    "Belt",
    "Bag",
    "Scarf",
    "Cap",
  ],
};

export const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const KID_SIZES = ["0-3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "8Y", "10Y"];

export function suggestedSizes(category) {
  if (category === "Kids") return KID_SIZES;
  return ADULT_SIZES;
}

// Colour presets now live in ./colours.js, which also owns the name → hex
// auto-mapping and the display helpers the storefront needs.

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 6;
export const DEFAULT_LOW_STOCK = 5;

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMaxBytes(bytes) {
  return formatBytes(bytes).replace(/\.0 /, " ");
}

/** Names the type list for a category, merging the database's own types in. */
export function productTypeOptions(category, existingTypes = []) {
  const recommended = RECOMMENDED_PRODUCT_TYPES[category] || [];
  const extras = (existingTypes || []).filter(
    (type) => type && !recommended.includes(type)
  );
  return [...recommended, ...extras];
}

export function categoryOptions(facets = []) {
  const fromDatabase = facets.map((facet) => facet.category).filter(Boolean);
  return [...new Set([...MAIN_CATEGORIES, ...fromDatabase])];
}

/**
 * Orders the product types that actually exist in a category so the storefront
 * sub-category bar follows the same running order as the admin form: the
 * recommended types first, then anything custom alphabetically.
 */
export function orderProductTypes(types, category) {
  const preferred = RECOMMENDED_PRODUCT_TYPES[category] || [];
  return [...new Set((types || []).filter(Boolean))].sort((a, b) => {
    const left = preferred.indexOf(a);
    const right = preferred.indexOf(b);
    if (left !== -1 && right !== -1) return left - right;
    if (left !== -1) return -1;
    if (right !== -1) return 1;
    return String(a).localeCompare(String(b));
  });
}

const CATEGORY_PREFIX = {
  Women: "WOM",
  Men: "MEN",
  Kids: "KID",
  Accessories: "ACC",
};

/** Client-side mirror of the server's auto-SKU so the owner can preview it. */
export function suggestSku(category, name) {
  const prefix = CATEGORY_PREFIX[category] || "PRD";
  const letters = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `SS-${prefix}-${letters || "NEW"}${stamp}`;
}

export function skuIsValid(value) {
  return /^[A-Z0-9][A-Z0-9-]{1,63}$/.test(String(value || "").trim().toUpperCase());
}

// The price boxes hold plain text, so a price is only ever turned into a
// usable number here, or refused outright. `null` means "no usable price yet",
// and that is exactly what every empty state and every guard checks for — which
// is how the form avoids ever rendering "Rs. 0", "Rs. NaN" or a negative
// amount for a field the owner has not filled in.
export function parsePriceInput(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const number = Number(text);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

export function calculateDiscountPercent(price, originalPrice) {
  const current = Number(price);
  const original = Number(originalPrice);
  if (!Number.isFinite(current) || !Number.isFinite(original)) return 0;
  if (original <= 0 || current <= 0 || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

export function stockState(stockQuantity, lowStockThreshold) {
  const stock = Number(stockQuantity) || 0;
  const threshold = Number.isFinite(Number(lowStockThreshold))
    ? Number(lowStockThreshold)
    : DEFAULT_LOW_STOCK;
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}

export const STOCK_STATE_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export const STATUS_OPTIONS = [
  {
    value: "draft",
    label: "Draft",
    hint: "Saved in your admin list but hidden from the public website.",
  },
  {
    value: "published",
    label: "Published",
    hint: "Live in the public catalogue straight away.",
  },
  {
    value: "archived",
    label: "Archived",
    hint: "Hidden from the store and kept safe for past orders.",
  },
];

export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file) {
  const name = file.name || "file";
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    return `"${name}" is not supported. Use a JPG, PNG, or WebP photo.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${name}" is ${formatBytes(file.size)}. Each photo must be ${formatMaxBytes(MAX_IMAGE_BYTES)} or smaller.`;
  }
  return "";
}
