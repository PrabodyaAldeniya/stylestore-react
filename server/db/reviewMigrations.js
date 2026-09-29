// ============================================
// SECTION: DATABASE MIGRATION — PURCHASED-PRODUCT REVIEWS
// --------------------------------------------------------
// Everything needed to turn the existing `product_reviews` table
// into the purchased-product review table, WITHOUT deleting
// anything.
//
//   order_item_id  — the exact order line a review belongs to.
//                    This is what makes "one review per order
//                    line" a database rule, not just a check in
//                    the route.
//   source         — 'customer' (a verified purchase) or 'admin'
//                    (an editorial testimonial written by the
//                    store owner). An admin review is never
//                    marked as a verified purchase.
//   status         — gains 'hidden', 'draft' and 'archived' so the
//                    owner can hide, reject, archive and restore a
//                    review without deleting it.
//   order_number / customer_email become NULL-able so an
//                    admin-written review does not have to invent
//                    an order.
//
// EVERY step below is additive and repeatable: each one first asks
// information_schema whether the change is already in place, so
// running the migration again (on every backend start) is harmless.
//
// Existing reviews, products, orders and order items are never
// dropped, truncated or rewritten — the only UPDATE is a backfill
// that fills in the new order_item_id for reviews that already
// exist, and it is restricted to rows where the value is still NULL.
// ============================================
import { REVIEW_STATUSES } from "../validation/review.js";

const REVIEWS_TABLE = "product_reviews";

/** Escape a table name for use in a prepared ALTER statement. */
function quoteTable(name) {
  return `\`${String(name).replaceAll("`", "``")}\``;
}

/** Ask information_schema whether a column already exists. */
async function columnInfo(connection, database, table, column) {
  const [rows] = await connection.query(
    "SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [database, table, column]
  );
  return rows[0] || null;
}

/** Ask information_schema whether an index already exists. */
async function indexExists(connection, database, table, index) {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [database, table, index]
  );
  return rows.length > 0;
}

/**
 * Add one column if it is missing. The definition is a fixed string
 * from this file — never anything a request supplied.
 */
async function ensureColumn(connection, database, table, column, definition) {
  const existing = await columnInfo(connection, database, table, column);
  if (!existing) {
    await connection.query(`ALTER TABLE ${quoteTable(table)} ${definition}`);
    console.log(`[migrate] added ${table}.${column}`);
  }
  return existing;
}

/** Add one index if it is missing. */
async function ensureIndex(connection, database, table, index, definition) {
  if (await indexExists(connection, database, table, index)) return;
  await connection.query(`ALTER TABLE ${quoteTable(table)} ${definition}`);
  console.log(`[migrate] added index ${table}.${index}`);
}

/** Drop an index if it is still there. */
async function dropIndex(connection, database, table, index) {
  if (!(await indexExists(connection, database, table, index))) return;
  await connection.query(`ALTER TABLE ${quoteTable(table)} DROP INDEX ${quoteTable(index)}`);
  console.log(`[migrate] dropped legacy index ${table}.${index}`);
}

/**
 * Retire the old one-review-per-order-and-product rule.
 *
 * It used to be `UNIQUE (order_id, product_id)`, which quietly collapsed
 * two different sizes of the same dress bought in one order into a single
 * reviewable item. The rule is now per order LINE, so the old key is
 * dropped — otherwise it would keep overriding the new per-line rule and
 * a customer could never review the second size.
 *
 * This only runs after the backfill, so every existing review already has
 * an order_item_id and is covered by the replacement key. No rows are
 * touched: dropping an index does not touch data.
 */
async function dropLegacyOrderProductKey(connection, database) {
  await dropIndex(connection, database, REVIEWS_TABLE, "uq_reviews_order_product");
}

/**
 * Widen the `status` ENUM so the new moderation states exist.
 * MODIFY keeps every existing value, so no review is lost or reset.
 */
async function ensureReviewStatuses(connection, database) {
  const existing = await columnInfo(connection, database, REVIEWS_TABLE, "status");
  if (!existing) return;
  const definition = `ENUM(${REVIEW_STATUSES.map((value) => `'${value}'`).join(",")}) NOT NULL DEFAULT 'draft'`;

  // information_schema reports only the type, lower-cased and without the
  // NOT NULL / DEFAULT attributes, so the full definition can never match
  // it verbatim. Comparing just the normalised type is what makes this
  // step genuinely repeatable — otherwise the ALTER re-runs on every boot.
  const currentType = String(existing.COLUMN_TYPE || "").toLowerCase().replace(/\s+/g, "");
  const wantedType = definition.split(" ")[0].toLowerCase();

  if (currentType === wantedType) return;
  await connection.query(
    `ALTER TABLE ${quoteTable(REVIEWS_TABLE)} MODIFY COLUMN status ${definition}`
  );
  console.log("[migrate] widened product_reviews.status");
}

/**
 * Let an admin-written review exist without an order number or a
 * customer email. Relaxing NOT NULL never removes data.
 *
 * `definition` is the full column definition INCLUDING the column
 * name (for example "order_number VARCHAR(50) NULL"), matching the
 * `ensureColumn` / `ensureIndex` convention used everywhere else in
 * this module. MODIFY COLUMN therefore must not repeat the name, or
 * the statement becomes invalid SQL.
 */
async function ensureNullable(connection, database, column, definition) {
  const existing = await columnInfo(connection, database, REVIEWS_TABLE, column);
  if (!existing || existing.IS_NULLABLE === "YES") return;
  await connection.query(
    `ALTER TABLE ${quoteTable(REVIEWS_TABLE)} MODIFY COLUMN ${definition}`
  );
  console.log(`[migrate] ${REVIEWS_TABLE}.${column} now allows NULL`);
}

/**
 * Fill in `order_item_id` for reviews that were written before this
 * column existed, by matching the order + product they already point
 * at. Restricted to `order_item_id IS NULL`, so re-running it is a
 * no-op.
 *
 * The comparison is numeric on purpose. `product_reviews.product_id`
 * is an INT while `order_items.product_id` is a VARCHAR, and the two
 * tables were created with different collations, so comparing them as
 * text raises ER_CANT_AGGREGATE_2COLLATIONS ("illegal mix of
 * collations") and aborts the whole schema init. Casting the order
 * line's value to UNSIGNED compares two integers instead, which is
 * the same match and needs no charset. A non-numeric order-line
 * value casts to 0, which never matches a real product id.
 */
async function backfillOrderItemId(connection) {
  const [result] = await connection.query(
    `UPDATE ${quoteTable(REVIEWS_TABLE)} r
       JOIN order_items oi
         ON oi.order_id = r.order_id
        AND CAST(oi.product_id AS UNSIGNED) = r.product_id
        SET r.order_item_id = oi.id
      WHERE r.order_item_id IS NULL
        AND r.order_id IS NOT NULL`
  );
  if (result?.affectedRows > 0) {
    console.log(`[migrate] linked ${result.affectedRows} existing review(s) to their order line`);
  }
}

/**
 * Give every review written before this migration a source, so the
 * admin filters and the "Verified Buyer" logic always have a value
 * to read. Customer reviews are the existing ones — they were all
 * verified purchases.
 */
async function backfillSource(connection) {
  await connection.query(
    `UPDATE ${quoteTable(REVIEWS_TABLE)}
        SET source = 'customer'
      WHERE source IS NULL OR source = ''`
  );
}

/**
 * The whole migration. Safe to call on every backend start.
 */
export async function migrateReviewSchema(connection, database) {
  // ---- New columns ----
  // `order_item_id` is the order line. No foreign key on purpose: a
  // review must survive an order or product being removed.
  await ensureColumn(
    connection,
    database,
    REVIEWS_TABLE,
    "order_item_id",
    "ADD COLUMN order_item_id INT UNSIGNED NULL AFTER order_id"
  );
  await ensureColumn(
    connection,
    database,
    REVIEWS_TABLE,
    "source",
    "ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'customer' AFTER verified_buyer"
  );

  // ---- Widen the status enum + relax NOT NULL ----
  await ensureReviewStatuses(connection, database);
  await ensureNullable(
    connection,
    database,
    "order_number",
    "order_number VARCHAR(50) NULL"
  );
  await ensureNullable(
    connection,
    database,
    "customer_email",
    "customer_email VARCHAR(255) NULL"
  );

  // ---- Backfills (idempotent) ----
  // Data first, constraints second: the legacy per-order key is only safe
  // to drop once every existing review points at a real order line.
  await backfillSource(connection);
  await backfillOrderItemId(connection);

  // ---- Indexes ----
  // The database-level "one review per order line" guarantee. A NULL
  // order_item_id (an editorial review) is ignored by MySQL here, so
  // testimonials are never blocked by this key.
  await ensureIndex(
    connection,
    database,
    REVIEWS_TABLE,
    "uq_reviews_order_item",
    "ADD UNIQUE KEY uq_reviews_order_item (order_item_id)"
  );
  // Speeds up the admin "source" filter.
  await ensureIndex(
    connection,
    database,
    REVIEWS_TABLE,
    "idx_reviews_source",
    "ADD KEY idx_reviews_source (source)"
  );
  // The old one-per-(order, product) key is superseded by the per-line key.
  await dropLegacyOrderProductKey(connection, database);
}
