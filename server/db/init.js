// ========================================
// Schema initializer.
// Creates mystylestore_db (if missing) and ensures the
// tables the API needs exist — reusing the ORIGINAL
// subscribers / orders / order_items tables that are
// already present in the XAMPP database.
//
// Safe to run on every backend start:
//  - CREATE DATABASE / TABLE ... IF NOT EXISTS
//  - additive ALTER TABLE ADD COLUMN only for columns
//    that are genuinely missing (existing data is kept)
// Mirrors server/db/schema.sql.
// ========================================
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedLegacyProducts } from "./seed.js";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, "..", "..", ".env") });

const DB_NAME = process.env.DB_NAME || "mystylestore_db";

// Table names are qualified with the database so the real database name
// from .env is respected even if this server process is not the default.
const quotedDatabaseName = `\`${DB_NAME.replaceAll("`", "``")}\``;
const q = (table) => `${quotedDatabaseName}.\`${table.replaceAll("`", "``")}\``;

// Base tables match the original XAMPP database (subscribers, orders,
// order_items) exactly — including the additive columns the checkout API
// needs (country / delivery_method / discount_code), which the migration
// below also adds to an already-existing orders table.
const STATEMENTS = [
  `CREATE DATABASE IF NOT EXISTS ${quotedDatabaseName}
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // ---- Newsletter subscribers (original table, kept as-is) ----
  `CREATE TABLE IF NOT EXISTS ${q("subscribers")} (
     id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
     email          VARCHAR(255) NOT NULL,
     consent        TINYINT(1)   NOT NULL DEFAULT 1,
     subscribed_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY email (email)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ---- Orders (original table + checkout columns) ----
  // Totals are ALWAYS computed server-side. No card numbers or CVVs are
  // ever stored here. Payment method enum matches the original table.
  `CREATE TABLE IF NOT EXISTS ${q("orders")} (
     id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
     order_number    VARCHAR(50)  NOT NULL,
     email           VARCHAR(255) NOT NULL,
     first_name      VARCHAR(100) NOT NULL,
     last_name       VARCHAR(100) NOT NULL,
     phone           VARCHAR(30)  NOT NULL,
     address         VARCHAR(255) NOT NULL,
     city            VARCHAR(100) NOT NULL,
     district        VARCHAR(100) NOT NULL,
     postal_code     VARCHAR(20)  NULL,
     country         VARCHAR(60)  NOT NULL DEFAULT 'Sri Lanka',
     delivery_method VARCHAR(30)  NOT NULL DEFAULT 'standard',
     payment_method  ENUM('cash_on_delivery','bank_deposit') NOT NULL,
     subtotal        DECIMAL(10,2) NOT NULL,
     discount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
     shipping_fee    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
     total           DECIMAL(10,2) NOT NULL,
     discount_code   VARCHAR(30)  NULL,
     status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
     created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY order_number (order_number)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ---- Order items (original table, kept as-is) ----
  // line totals are computed from quantity × unit_price when reading.
  `CREATE TABLE IF NOT EXISTS ${q("order_items")} (
     id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
     order_id     INT UNSIGNED NOT NULL,
     product_id   VARCHAR(100) NOT NULL,
     product_name VARCHAR(255) NOT NULL,
     size         VARCHAR(30)  NULL,
     color        VARCHAR(50)  NULL,
     quantity     INT UNSIGNED NOT NULL,
     unit_price   DECIMAL(10,2) NOT NULL,
     PRIMARY KEY (id),
     KEY order_id (order_id),
     CONSTRAINT fk_items_order
       FOREIGN KEY (order_id) REFERENCES ${q("orders")}(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS ${q("system_seed_markers")} (
     seed_key   VARCHAR(100) NOT NULL,
     seeded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (seed_key)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ---- Discount codes (new; used by the existing discount feature) ----
  // `expires_at` optionally stops a code after a date; `max_uses`/`times_used`
  // optionally cap the total number of redemptions. NEWUSER uses per-email
  // single-use enforcement (checked against the orders table), so its
  // `max_uses` stays NULL (no global cap).
  `CREATE TABLE IF NOT EXISTS ${q("discount_codes")} (
     id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
     code        VARCHAR(30)  NOT NULL,
     percent_off INT UNSIGNED NOT NULL,
     active      TINYINT(1)   NOT NULL DEFAULT 1,
     expires_at  DATETIME     NULL,
     max_uses    INT UNSIGNED NULL,
     times_used  INT UNSIGNED NOT NULL DEFAULT 0,
     description VARCHAR(160) NULL,
     created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY code (code)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `INSERT INTO ${q("discount_codes")} (code, percent_off, active, description)
      VALUES ('NEWUSER', 15, 1, '15% off your first order')
      ON DUPLICATE KEY UPDATE code = VALUES(code)`,

  // ---- Catalogue products ----
  `CREATE TABLE IF NOT EXISTS ${q("products")} (
     id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
     sku               VARCHAR(64)  NOT NULL,
     name              VARCHAR(255) NOT NULL,
     category          VARCHAR(80)  NOT NULL,
     product_type      VARCHAR(80)  NOT NULL,
     short_description VARCHAR(500) NULL,
     description       TEXT         NOT NULL,
     price             DECIMAL(10,2) NOT NULL,
     original_price    DECIMAL(10,2) NULL,
     stock_quantity    INT UNSIGNED NOT NULL DEFAULT 0,
     low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
     is_new            TINYINT(1)   NOT NULL DEFAULT 0,
     is_featured       TINYINT(1)   NOT NULL DEFAULT 0,
     is_sale           TINYINT(1)   NOT NULL DEFAULT 0,
     rating            DECIMAL(2,1) NOT NULL DEFAULT 0.0,
     rating_count      INT UNSIGNED NOT NULL DEFAULT 0,
     status            VARCHAR(20)  NOT NULL DEFAULT 'draft',
     created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY sku (sku),
     KEY idx_products_status (status),
     KEY idx_products_category (category),
     KEY idx_products_price (price)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS ${q("product_images")} (
     id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
     product_id  INT UNSIGNED NOT NULL,
     path        VARCHAR(500) NOT NULL,
     alt_text    VARCHAR(255) NULL,
     sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
     is_primary  TINYINT(1)   NOT NULL DEFAULT 0,
     created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     KEY idx_images_product (product_id, sort_order),
     CONSTRAINT fk_images_product
       FOREIGN KEY (product_id) REFERENCES ${q("products")}(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS ${q("product_sizes")} (
     id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
     product_id  INT UNSIGNED NOT NULL,
     size        VARCHAR(30) NOT NULL,
     sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
     PRIMARY KEY (id),
     UNIQUE KEY product_size (product_id, size),
     CONSTRAINT fk_sizes_product
       FOREIGN KEY (product_id) REFERENCES ${q("products")}(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS ${q("product_colours")} (
     id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
     product_id  INT UNSIGNED NOT NULL,
     name        VARCHAR(50) NOT NULL,
     hex         CHAR(7) NULL,
     sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
     PRIMARY KEY (id),
     UNIQUE KEY product_colour (product_id, name),
     CONSTRAINT fk_colours_product
       FOREIGN KEY (product_id) REFERENCES ${q("products")}(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const ORDER_ADDITIONS = [
  { column: "country", definition: "ADD COLUMN country VARCHAR(60) NOT NULL DEFAULT 'Sri Lanka' AFTER district" },
  { column: "delivery_method", definition: "ADD COLUMN delivery_method VARCHAR(30) NOT NULL DEFAULT 'standard' AFTER payment_method" },
  { column: "discount_code", definition: "ADD COLUMN discount_code VARCHAR(30) NULL AFTER total" },
];

const ORDER_ITEM_ADDITIONS = [
  { column: "product_sku", definition: "ADD COLUMN product_sku VARCHAR(64) NULL AFTER product_id" },
  { column: "product_image_path", definition: "ADD COLUMN product_image_path VARCHAR(500) NULL AFTER product_name" },
];

const PRODUCT_ADDITIONS = [
  { column: "rating", definition: "ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 0.0 AFTER is_sale" },
  { column: "rating_count", definition: "ADD COLUMN rating_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER rating" },
  {
    column: "low_stock_threshold",
    definition:
      "ADD COLUMN low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5 AFTER stock_quantity",
  },
];

// Additive migrations for discount_codes so a table created by an older run
// (without the validity/usage columns) is brought up to date without touching
// existing rows.
const DISCOUNT_ADDITIONS = [
  { column: "expires_at", definition: "ADD COLUMN expires_at DATETIME NULL AFTER active" },
  { column: "max_uses", definition: "ADD COLUMN max_uses INT UNSIGNED NULL AFTER expires_at" },
  { column: "times_used", definition: "ADD COLUMN times_used INT UNSIGNED NOT NULL DEFAULT 0 AFTER max_uses" },
];

async function ensureColumn(connection, table, column, definition) {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [DB_NAME, table, column]
  );
  if (rows.length === 0) {
    await connection.query(`ALTER TABLE ${q(table)} ${definition}`);
  }
}

export async function initializeDatabase() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";

  const connection = await mysql.createConnection({ host, port, user, password });

  try {
    for (const statement of STATEMENTS) {
      await connection.query(statement);
    }
    await connection.query(`USE ${quotedDatabaseName}`);

    // Additive migrations: bring an older/other schema up to the fields the
    // checkout API writes without touching existing data or tables.
    for (const addition of ORDER_ADDITIONS) {
      await ensureColumn(connection, "orders", addition.column, addition.definition);
    }
    for (const addition of ORDER_ITEM_ADDITIONS) {
      await ensureColumn(connection, "order_items", addition.column, addition.definition);
    }
    for (const addition of PRODUCT_ADDITIONS) {
      await ensureColumn(connection, "products", addition.column, addition.definition);
    }
    for (const addition of DISCOUNT_ADDITIONS) {
      await ensureColumn(connection, "discount_codes", addition.column, addition.definition);
    }
    await seedLegacyProducts(connection);
  } finally {
    await connection.end();
  }
}