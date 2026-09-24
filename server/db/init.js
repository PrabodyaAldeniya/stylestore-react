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
import mysql from "mysql2/promise";

const DB_NAME = process.env.DB_NAME || "mystylestore_db";

// Table names are qualified with the database so the real database name
// from .env is respected even if this server process is not the default.
const q = (table) => `\`${DB_NAME}\`.\`${table}\``;

// Base tables match the original XAMPP database (subscribers, orders,
// order_items) exactly — including the additive columns the checkout API
// needs (country / delivery_method / discount_code), which the migration
// below also adds to an already-existing orders table.
const STATEMENTS = [
  `CREATE DATABASE IF NOT EXISTS ${DB_NAME}
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

  // ---- Discount codes (new; used by the existing discount feature) ----
  `CREATE TABLE IF NOT EXISTS ${q("discount_codes")} (
     id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
     code        VARCHAR(30)  NOT NULL,
     percent_off INT UNSIGNED NOT NULL,
     active      TINYINT(1)   NOT NULL DEFAULT 1,
     description VARCHAR(160) NULL,
     created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY code (code)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `INSERT INTO ${q("discount_codes")} (code, percent_off, active, description)
     VALUES ('NEWUSER', 15, 1, '15% off your first order')
     ON DUPLICATE KEY UPDATE percent_off = VALUES(percent_off), active = 1`,
];

const ORDER_ADDITIONS = [
  { column: "country", definition: "ADD COLUMN country VARCHAR(60) NOT NULL DEFAULT 'Sri Lanka' AFTER district" },
  { column: "delivery_method", definition: "ADD COLUMN delivery_method VARCHAR(30) NOT NULL DEFAULT 'standard' AFTER payment_method" },
  { column: "discount_code", definition: "ADD COLUMN discount_code VARCHAR(30) NULL AFTER total" },
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

    // Additive migrations: bring an older/other schema up to the fields the
    // checkout API writes without touching existing data or tables.
    for (const addition of ORDER_ADDITIONS) {
      await ensureColumn(connection, "orders", addition.column, addition.definition);
    }
  } finally {
    await connection.end();
  }
}