// ============================================
// SECTION: DATABASE MIGRATION — PRODUCT SIZE MODES
// --------------------------------------------------------
// Adds ONE column, `products.size_mode`, and backfills it for the
// products that already exist. Nothing is dropped, truncated or
// recreated, and no existing size, colour, image, order or review
// row is touched.
//
//   size_mode  'standard'        customer chooses a size
//              'free_size'       exactly one universal size
//              'not_applicable'  no size at all
//
// The column is added NULL-able first so the backfill can tell
// "not decided yet" from "the owner deliberately chose standard".
// Only rows that are still NULL are given a value, so a mode the
// admin selected by hand is never overwritten. A later step makes the
// column NOT NULL with a safe default, which is a structural
// guarantee rather than a data change.
//
// Backfill rules (run on every start, so re-running is harmless):
//   * a product with no size rows            -> not_applicable
//   * a product whose only size is Free Size,
//     Adjustable or One Size                -> free_size
//   * everything else                        -> standard
//
// `Adjustable` is included on purpose: it is a universal single
// size, which is exactly what free_size describes. Its own stored
// size text is left completely alone, so a cap that says
// "Adjustable" keeps saying "Adjustable".
// ============================================
import {
  SIZE_MODE_FREE_SIZE,
  SIZE_MODE_NOT_APPLICABLE,
  SIZE_MODE_STANDARD,
} from "../lib/sizeModes.js";

const PRODUCTS_TABLE = "products";

/** Escape a table name for a prepared statement. */
function quoteTable(name) {
  return `\`${String(name).replaceAll("`", "``")}\``;
}

async function columnInfo(connection, database, table, column) {
  const [rows] = await connection.query(
    "SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [database, table, column]
  );
  return rows[0] || null;
}

async function indexExists(connection, database, table, index) {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [database, table, index]
  );
  return rows.length > 0;
}

async function ensureColumn(connection, database, column, definition) {
  const existing = await columnInfo(connection, database, PRODUCTS_TABLE, column);
  if (existing) return existing;
  await connection.query(`ALTER TABLE ${quoteTable(PRODUCTS_TABLE)} ${definition}`);
  console.log(`[migrate] added ${PRODUCTS_TABLE}.${column}`);
  return columnInfo(connection, database, PRODUCTS_TABLE, column);
}

/**
 * Give every product that has no decided mode one that matches the sizes it
 * already has. Restricted to `size_mode IS NULL`, so it never touches a mode an
 * admin chose.
 */
async function backfillSizeMode(connection) {
  const [result] = await connection.query(
    `UPDATE ${quoteTable(PRODUCTS_TABLE)} p
       LEFT JOIN (
            SELECT product_id,
                   COUNT(*) AS size_count,
                   MIN(size) AS only_size
              FROM product_sizes
             GROUP BY product_id
           ) s ON s.product_id = p.id
        SET p.size_mode = CASE
              WHEN COALESCE(s.size_count, 0) = 0 THEN '${SIZE_MODE_NOT_APPLICABLE}'
              WHEN s.size_count = 1 AND LOWER(TRIM(s.only_size)) IN
                   ('free size', 'adjustable', 'one size', 'one size fits all')
                THEN '${SIZE_MODE_FREE_SIZE}'
              ELSE '${SIZE_MODE_STANDARD}'
            END
      WHERE p.size_mode IS NULL`
  );
  if (result?.affectedRows > 0) {
    console.log(`[migrate] set size_mode on ${result.affectedRows} existing product(s)`);
  }
}

/**
 * Make the column NOT NULL so no future row can skip the decision. MODIFY only
 * changes the column definition — every row already has a value by this point,
 * because the backfill runs first.
 */
async function ensureNotNull(connection, database) {
  const existing = await columnInfo(connection, database, PRODUCTS_TABLE, "size_mode");
  if (!existing || existing.IS_NULLABLE !== "YES") return;
  await connection.query(
    `ALTER TABLE ${quoteTable(PRODUCTS_TABLE)} MODIFY COLUMN size_mode VARCHAR(20) NOT NULL DEFAULT '${SIZE_MODE_STANDARD}'`
  );
  console.log("[migrate] products.size_mode now requires a value");
}

/** The whole migration. Safe to call on every backend start. */
export async function migrateSizeModeSchema(connection, database) {
  // NULL first, so the backfill can still tell "unset" from "chosen".
  await ensureColumn(
    connection,
    database,
    "size_mode",
    "ADD COLUMN size_mode VARCHAR(20) NULL AFTER status"
  );

  // Data first, constraint second: only once every product has a decided mode
  // is NOT NULL safe to apply.
  await backfillSizeMode(connection);
  await ensureNotNull(connection, database);

  // Keeps the admin size-mode filter / listing fast. The index is optional,
  // so a table that already has it is left exactly as it is.
  if (!(await indexExists(connection, database, PRODUCTS_TABLE, "idx_products_size_mode"))) {
    await connection.query(
      `ALTER TABLE ${quoteTable(PRODUCTS_TABLE)} ADD KEY idx_products_size_mode (size_mode)`
    );
    console.log(`[migrate] added index ${PRODUCTS_TABLE}.idx_products_size_mode`);
  }
}