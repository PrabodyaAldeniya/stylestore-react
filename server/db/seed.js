import legacyProducts from "./seed-products.js";

const productInsert = `
  INSERT IGNORE INTO products
    (sku, name, category, product_type, short_description, description,
     price, original_price, stock_quantity, is_new, is_featured, is_sale,
     rating, rating_count, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const sizeInsert = `
  INSERT IGNORE INTO product_sizes (product_id, size, sort_order)
  VALUES (?, ?, ?)`;

const colourInsert = `
  INSERT IGNORE INTO product_colours (product_id, name, hex, sort_order)
  VALUES (?, ?, ?, ?)`;

const LEGACY_SEED_KEY = "legacy-products-v1";

export async function seedLegacyProducts(connection) {
  const [markerRows] = await connection.query(
    "SELECT 1 FROM system_seed_markers WHERE seed_key = ? LIMIT 1",
    [LEGACY_SEED_KEY]
  );
  if (markerRows.length > 0) return;

  for (const product of legacyProducts) {
    await connection.query(productInsert, [
      product.sku,
      product.name,
      product.category,
      product.productType,
      product.shortDescription,
      product.description,
      product.price,
      product.originalPrice ?? null,
      product.stockQuantity ?? 0,
      product.isNew ? 1 : 0,
      product.isFeatured ? 1 : 0,
      product.originalPrice && product.originalPrice > product.price ? 1 : 0,
      product.rating ?? 0,
      product.ratingCount ?? 0,
      product.status,
    ]);

    const [rows] = await connection.query(
      "SELECT id FROM products WHERE sku = ? LIMIT 1",
      [product.sku]
    );
    const productId = rows[0]?.id;
    if (!productId) continue;

    const [sizeRows] = await connection.query(
      "SELECT 1 FROM product_sizes WHERE product_id = ? LIMIT 1",
      [productId]
    );
    if (sizeRows.length === 0) {
      for (const [index, size] of product.sizes.entries()) {
        await connection.query(sizeInsert, [productId, size, index]);
      }
    }

    const [colourRows] = await connection.query(
      "SELECT 1 FROM product_colours WHERE product_id = ? LIMIT 1",
      [productId]
    );
    if (colourRows.length === 0) {
      for (const [index, colour] of product.colours.entries()) {
        await connection.query(colourInsert, [
          productId,
          colour.name,
          colour.hex ?? null,
          index,
        ]);
      }
    }
  }

  await connection.query(
    "INSERT IGNORE INTO system_seed_markers (seed_key) VALUES (?)",
    [LEGACY_SEED_KEY]
  );
}
