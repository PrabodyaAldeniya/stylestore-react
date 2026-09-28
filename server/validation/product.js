const MAX_NAME_LENGTH = 255;
const MAX_STOCK = 1_000_000;
const MAX_VARIANTS = 30;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function fieldError(message) {
  return { message };
}

function cleanText(value, maxLength) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toInteger(value) {
  const number = toNumber(value);
  return number === null ? null : Math.trunc(number);
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function splitList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(",");
      }
    }
    return value.split(",");
  }
  return [];
}

function normalizeSizes(value) {
  return [...new Set(splitList(value).map((item) => cleanText(item, 30)).filter(Boolean))].slice(
    0,
    MAX_VARIANTS
  );
}

function normalizeColours(value) {
  const input = Array.isArray(value) ? value : splitList(value);
  const seen = new Set();
  return input
    .map((colour) => {
      if (typeof colour === "string") {
        const [name, hex] = colour.split("|").map((item) => item.trim());
        return { name: cleanText(name, 50), hex: cleanText(hex, 7) || null };
      }
      return {
        name: cleanText(colour?.name, 50),
        hex: cleanText(colour?.hex, 7) || null,
      };
    })
    .filter((colour) => {
      const key = colour.name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_VARIANTS);
}

function makeSku(name, category) {
  const prefix = cleanText(category, 8)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase() || "PRD";
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, "0")}`.toUpperCase();
  return `SS-${prefix}-${suffix}`;
}

export function validateProduct(body = {}, { partial = false } = {}) {
  const errors = {};
  const value = {};
  const required = (field) => !partial || body[field] !== undefined;

  const name = body.name === undefined ? undefined : cleanText(body.name, MAX_NAME_LENGTH);
  if (required("name")) {
    if (!name || name.length < 2) errors.name = fieldError("Enter a product name.");
    else value.name = name;
  }

  let sku = body.sku === undefined ? undefined : cleanText(body.sku, 64).toUpperCase();
  if (body.sku === undefined && body.name && body.category) {
    sku = makeSku(body.name, body.category);
  }
  if (required("sku")) {
    if (!sku) sku = makeSku(body.name, body.category);
    if (!/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(sku)) {
      errors.sku = fieldError("Use 2–64 letters, numbers, or hyphens.");
    } else {
      value.sku = sku;
    }
  }

  for (const [field, label, maxLength] of [
    ["category", "category", 80],
    ["productType", "product type", 80],
  ]) {
    const item = body[field] === undefined ? undefined : cleanText(body[field], maxLength);
    if (required(field)) {
      if (!item) errors[field] = fieldError(`Enter a ${label}.`);
      else value[field] = item;
    }
  }

  const description =
    body.description === undefined
      ? undefined
      : cleanText(body.description, 10000);
  if (required("description")) {
    if (!description || description.length < 5) {
      errors.description = fieldError("Enter a useful product description.");
    } else {
      value.description = description;
    }
  }

  const shortDescription =
    body.shortDescription === undefined
      ? value.description?.slice(0, 160) || ""
      : cleanText(body.shortDescription, 500);
  if (body.shortDescription !== undefined || !partial) {
    value.shortDescription = shortDescription || value.description?.slice(0, 160) || "";
  }

  const price = toNumber(body.price);
  if (required("price")) {
    if (price === null || price <= 0 || price > 99_999_999) {
      errors.price = fieldError("Enter a price greater than zero.");
    } else {
      value.price = Math.round(price * 100) / 100;
    }
  }

  const originalPrice =
    body.originalPrice === undefined || body.originalPrice === ""
      ? null
      : toNumber(body.originalPrice);
  if (
    body.originalPrice !== undefined &&
    originalPrice !== null &&
    (originalPrice <= 0 || originalPrice > 99_999_999)
  ) {
    errors.originalPrice = fieldError("Enter a valid original price or leave it blank.");
  } else if (
    originalPrice !== null &&
    value.price !== undefined &&
    originalPrice < value.price
  ) {
    errors.originalPrice = fieldError("Original price must be at least the current price.");
  } else if (body.originalPrice !== undefined) {
    value.originalPrice = originalPrice;
  }

  const stockQuantity = toInteger(body.stockQuantity ?? body.stock);
  if (required("stockQuantity")) {
    if (stockQuantity === null || stockQuantity < 0 || stockQuantity > MAX_STOCK) {
      errors.stockQuantity = fieldError("Enter stock as a whole number from 0 to 1,000,000.");
    } else {
      value.stockQuantity = stockQuantity;
    }
  }

  const rating = toNumber(body.rating ?? 0);
  if (rating === null || rating < 0 || rating > 5) {
    errors.rating = fieldError("Rating must be between 0 and 5.");
  } else {
    value.rating = Math.round(rating * 10) / 10;
  }
  const ratingCount = toInteger(body.ratingCount ?? body.rating_count ?? 0);
  if (ratingCount === null || ratingCount < 0 || ratingCount > MAX_STOCK) {
    errors.ratingCount = fieldError("Rating count must be zero or a positive whole number.");
  } else {
    value.ratingCount = ratingCount;
  }

  const sizes = normalizeSizes(body.sizes);
  const colours = normalizeColours(body.colours);
  if (body.sizes !== undefined || !partial) {
    if (!sizes.length) errors.sizes = fieldError("Add at least one size.");
    else value.sizes = sizes;
  }
  if (body.colours !== undefined || !partial) {
    if (!colours.length) errors.colours = fieldError("Add at least one colour.");
    else if (colours.some((colour) => colour.hex && !HEX_COLOR.test(colour.hex))) {
      errors.colours = fieldError("Colours must use hex values such as #1e1e1e.");
    } else {
      value.colours = colours;
    }
  }

  for (const field of ["isNew", "isFeatured", "isSale"]) {
    if (body[field] !== undefined || !partial) value[field] = toBoolean(body[field]);
  }

  if (body.status !== undefined || !partial) {
    const status = body.status === undefined ? "draft" : cleanText(body.status, 20);
    if (!["draft", "published"].includes(status)) {
      errors.status = fieldError("Status must be draft or published.");
    } else {
      value.status = status;
    }
  }

  if (Object.keys(errors).length) {
    const error = new Error("Please check the product fields.");
    error.code = "VALIDATION_ERROR";
    error.status = 422;
    error.fields = errors;
    throw error;
  }
  return value;
}

export function parseProductId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error("Product ID must be a positive integer.");
    error.code = "VALIDATION_ERROR";
    error.status = 422;
    throw error;
  }
  return id;
}

export { normalizeColours, normalizeSizes };
