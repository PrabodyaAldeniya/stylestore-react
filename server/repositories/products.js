import pool from "../db.js";

const PRODUCT_COLUMNS = `
  p.id,
  p.sku,
  p.name,
  p.category,
  p.product_type,
  p.short_description,
  p.description,
  p.price,
  p.original_price,
  p.stock_quantity,
  p.is_new,
  p.is_featured,
  p.is_sale,
  p.rating,
  p.rating_count,
  p.status,
  p.created_at,
  p.updated_at`;

const PUBLIC_STATUS = "published";
const MAX_PAGE_SIZE = 100;

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toProduct(row, relations = {}) {
  const price = numberOrNull(row.price);
  const originalPrice = numberOrNull(row.original_price);
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    productType: row.product_type,
    shortDescription: row.short_description,
    description: row.description,
    price,
    originalPrice,
    discountPercent:
      originalPrice && price !== null && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0,
    stockQuantity: Number(row.stock_quantity || 0),
    isNew: Boolean(row.is_new),
    isFeatured: Boolean(row.is_featured),
    isSale: Boolean(row.is_sale),
    rating: numberOrNull(row.rating) || 0,
    ratingCount: Number(row.rating_count || 0),
    status: row.status,
    images: (relations.images || []).map((image) => ({
      id: image.id,
      path: image.path,
      url: image.path,
      altText: image.alt_text,
      isPrimary: Boolean(image.is_primary),
    })),
    sizes: (relations.sizes || []).map((size) => size.size),
    colours: (relations.colours || []).map((colour) => ({
      name: colour.name,
      hex: colour.hex,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function loadRelations(connection, rows) {
  if (!rows.length) return new Map();

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [images] = await connection.query(
    `SELECT id, product_id, path, alt_text, sort_order, is_primary
       FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    ids
  );
  const [sizes] = await connection.query(
    `SELECT product_id, size
       FROM product_sizes
      WHERE product_id IN (${placeholders})
      ORDER BY sort_order ASC, id ASC`,
    ids
  );
  const [colours] = await connection.query(
    `SELECT product_id, name, hex
       FROM product_colours
      WHERE product_id IN (${placeholders})
      ORDER BY sort_order ASC, id ASC`,
    ids
  );

  const grouped = new Map(
    ids.map((id) => [id, { images: [], sizes: [], colours: [] }])
  );
  for (const image of images) {
    grouped.get(image.product_id)?.images.push(image);
  }
  for (const size of sizes) {
    grouped.get(size.product_id)?.sizes.push(size);
  }
  for (const colour of colours) {
    grouped.get(colour.product_id)?.colours.push(colour);
  }
  return grouped;
}

function listQuery({ includeDrafts, search, category, status, sort }) {
  const conditions = [];
  const values = [];
  if (!includeDrafts) {
    conditions.push("p.status = ?");
    values.push(PUBLIC_STATUS);
  } else if (["draft", "published"].includes(status)) {
    conditions.push("p.status = ?");
    values.push(status);
  }
  if (search) {
    conditions.push(
      "(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ? OR p.product_type LIKE ? OR p.short_description LIKE ?)"
    );
    const term = `%${search}%`;
    values.push(term, term, term, term, term);
  }
  if (category) {
    conditions.push("p.category = ?");
    values.push(category);
  }

  const orderBy = {
    featured: "p.is_featured DESC, p.created_at DESC, p.id DESC",
    newest: "p.created_at DESC, p.id DESC",
    oldest: "p.created_at ASC, p.id ASC",
    "price-asc": "p.price ASC, p.id DESC",
    "price-desc": "p.price DESC, p.id DESC",
    name: "p.name ASC, p.id ASC",
  }[sort] || "p.created_at DESC, p.id DESC";

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    orderBy,
    values,
  };
}

export async function listProducts(options = {}, connection = pool) {
  const includeDrafts = Boolean(options.includeDrafts);
  const pageSize = Math.min(
    Math.max(Number(options.pageSize) || 24, 1),
    MAX_PAGE_SIZE
  );
  const page = Math.max(Number(options.page) || 1, 1);
  const query = listQuery({
    includeDrafts,
    search: options.search?.trim() || "",
    category: options.category?.trim() || "",
    status: options.status,
    sort: options.sort,
  });

  const [rows] = await connection.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       ${query.where}
      ORDER BY ${query.orderBy}
      LIMIT ? OFFSET ?`,
    [...query.values, pageSize, (page - 1) * pageSize]
  );
  const [countRows] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM products p
       ${query.where}`,
    query.values
  );
  const relations = await loadRelations(connection, rows);
  const total = Number(countRows[0]?.total || 0);
  return {
    products: rows.map((row) => toProduct(row, relations.get(row.id))),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function getProductById(
  id,
  { includeDrafts = false, connection = pool, forUpdate = false } = {}
) {
  const [rows] = await connection.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
      WHERE p.id = ?${includeDrafts ? "" : " AND p.status = ?"}${forUpdate ? " FOR UPDATE" : ""}`,
    includeDrafts ? [id] : [id, PUBLIC_STATUS]
  );
  if (!rows.length) return null;
  const relations = await loadRelations(connection, rows);
  return toProduct(rows[0], relations.get(rows[0].id));
}

export async function getPublishedProductForCheckout(id, connection) {
  const [rows] = await connection.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
      WHERE p.id = ? AND p.status = ?
      FOR UPDATE`,
    [id, PUBLIC_STATUS]
  );
  if (!rows.length) return null;
  const relations = await loadRelations(connection, rows);
  return toProduct(rows[0], relations.get(rows[0].id));
}

export async function createProduct(data, connection = pool) {
  try {
    const [result] = await connection.query(
      `INSERT INTO products
        (sku, name, category, product_type, short_description, description,
         price, original_price, stock_quantity, is_new, is_featured, is_sale,
         rating, rating_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.sku,
        data.name,
        data.category,
        data.productType,
        data.shortDescription,
        data.description,
        data.price,
        data.originalPrice,
        data.stockQuantity,
        data.isNew ? 1 : 0,
        data.isFeatured ? 1 : 0,
        data.isSale || (data.originalPrice && data.originalPrice > data.price)
          ? 1
          : 0,
        data.rating,
        data.ratingCount,
        data.status,
      ]
    );
    const productId = result.insertId;
    await replaceProductOptions(productId, data.sizes, data.colours, connection);
    return getProductById(productId, { includeDrafts: true, connection });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw productError("A product with this SKU already exists.", "SKU_EXISTS", 409);
    }
    throw error;
  }
}

export async function updateProduct(id, data, connection = pool) {
  const existing = await getProductById(id, { includeDrafts: true, connection });
  if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);

  try {
    await connection.query(
      `UPDATE products
          SET sku = ?, name = ?, category = ?, product_type = ?,
              short_description = ?, description = ?, price = ?,
              original_price = ?, stock_quantity = ?, is_new = ?,
              is_featured = ?, is_sale = ?, rating = ?, rating_count = ?, status = ?
        WHERE id = ?`,
      [
        data.sku,
        data.name,
        data.category,
        data.productType,
        data.shortDescription,
        data.description,
        data.price,
        data.originalPrice,
        data.stockQuantity,
        data.isNew ? 1 : 0,
        data.isFeatured ? 1 : 0,
        data.isSale || (data.originalPrice && data.originalPrice > data.price)
          ? 1
          : 0,
        data.rating,
        data.ratingCount,
        data.status,
        id,
      ]
    );
    await replaceProductOptions(id, data.sizes, data.colours, connection);
    return getProductById(id, { includeDrafts: true, connection });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw productError("A product with this SKU already exists.", "SKU_EXISTS", 409);
    }
    throw error;
  }
}

async function replaceProductOptions(productId, sizes, colours, connection) {
  await connection.query("DELETE FROM product_sizes WHERE product_id = ?", [productId]);
  await connection.query("DELETE FROM product_colours WHERE product_id = ?", [productId]);
  if (sizes.length) {
    const values = sizes.map((size, index) => [productId, size, index]);
    await connection.query(
      "INSERT INTO product_sizes (product_id, size, sort_order) VALUES ?",
      [values]
    );
  }
  if (colours.length) {
    const values = colours.map((colour, index) => [
      productId,
      colour.name,
      colour.hex,
      index,
    ]);
    await connection.query(
      "INSERT INTO product_colours (product_id, name, hex, sort_order) VALUES ?",
      [values]
    );
  }
}

export async function deleteProduct(id, connection = pool) {
  const [result] = await connection.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function addProductImage(
  productId,
  { path: imagePath, altText = "", sortOrder = 0, isPrimary = false },
  connection = pool
) {
  const product = await getProductById(productId, { includeDrafts: true, connection });
  if (!product) throw productError("Product not found.", "NOT_FOUND", 404);
  if (isPrimary) {
    await connection.query(
      "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
      [productId]
    );
  }
  const [result] = await connection.query(
    `INSERT INTO product_images (product_id, path, alt_text, sort_order, is_primary)
     VALUES (?, ?, ?, ?, ?)`,
    [productId, imagePath, altText || null, sortOrder, isPrimary ? 1 : 0]
  );
  return getProductById(productId, { includeDrafts: true, connection }).then(
    () => result
  );
}

export async function removeProductImage(productId, imageId, connection = pool) {
  const [rows] = await connection.query(
    "SELECT id, path, is_primary FROM product_images WHERE id = ? AND product_id = ?",
    [imageId, productId]
  );
  if (!rows.length) return null;
  await connection.query("DELETE FROM product_images WHERE id = ?", [imageId]);
  if (rows[0].is_primary) {
    const [next] = await connection.query(
      "SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1",
      [productId]
    );
    if (next.length) {
      await connection.query("UPDATE product_images SET is_primary = 1 WHERE id = ?", [
        next[0].id,
      ]);
    }
  }
  return rows[0];
}

export async function setPrimaryProductImage(productId, imageId, connection = pool) {
  const [rows] = await connection.query(
    "SELECT id FROM product_images WHERE id = ? AND product_id = ?",
    [imageId, productId]
  );
  if (!rows.length) throw productError("Image not found.", "NOT_FOUND", 404);
  await connection.query(
    "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
    [productId]
  );
  await connection.query("UPDATE product_images SET is_primary = 1 WHERE id = ?", [imageId]);
  return getProductById(productId, { includeDrafts: true, connection });
}

export async function getProductImagePath(productId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT path FROM product_images
      WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1`,
    [productId]
  );
  return rows[0]?.path || null;
}

export { productError, toProduct };
