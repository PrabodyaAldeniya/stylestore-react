-- ========================================================
-- StyleStore checkout schema (MySQL / MariaDB)
-- Run once manually in phpMyAdmin / mysql CLI, OR let the
-- backend auto-run it at startup via server/db/init.js.
-- Mirrored statement-for-statement in init.js.
--
-- Reuses the ORIGINAL XAMPP tables (subscribers, orders,
-- order_items) and only adds the discount_codes table plus
-- the additive checkout columns the API needs.
-- ========================================================

CREATE DATABASE IF NOT EXISTS mystylestore_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mystylestore_db;

-- --------------------------------------------------------
-- Subscribers — newsletter emails (original table).
-- UNIQUE(email) guarantees no duplicate records.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  consent       TINYINT(1)   NOT NULL DEFAULT 1,
  subscribed_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Orders — totals are ALWAYS computed server-side.
-- No card numbers or CVVs are ever stored here.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Order items — line-level snapshot of what was ordered.
-- A line total is quantity × unit_price (computed on read).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Discount codes — server-validated percentage discounts.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30) NOT NULL,
  percent_off INT UNSIGNED NOT NULL,
  active      TINYINT(1)  NOT NULL DEFAULT 1,
  description VARCHAR(160) NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the first-order 15% code.
INSERT INTO discount_codes (code, percent_off, active, description)
VALUES ('NEWUSER', 15, 1, '15% off your first order')
ON DUPLICATE KEY UPDATE percent_off = VALUES(percent_off), active = 1;

-- --------------------------------------------------------
-- Additive migrations for databases that were created
-- before the checkout columns existed. Safe to run anytime:
-- each ADD COLUMN only runs when the column is missing.
-- (init.js performs the same checks automatically.)
-- --------------------------------------------------------
SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'country'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE orders ADD COLUMN country VARCHAR(60) NOT NULL DEFAULT ''Sri Lanka'' AFTER district',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'delivery_method'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE orders ADD COLUMN delivery_method VARCHAR(30) NOT NULL DEFAULT ''standard'' AFTER payment_method',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'discount_code'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE orders ADD COLUMN discount_code VARCHAR(30) NULL AFTER total',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;