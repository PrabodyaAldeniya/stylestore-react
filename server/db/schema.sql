-- ========================================================
-- StyleStore checkout schema (MySQL / MariaDB)
-- Run once manually in phpMyAdmin / mysql CLI, OR let the
-- backend auto-run it at startup via server/db/init.js.
-- Mirrored statement-for-statement in init.js.
--
-- Reuses the ORIGINAL XAMPP tables (subscribers, orders,
-- order_items) and only adds the discount_codes table, the
-- catalogue tables and the additive checkout columns the
-- API needs. Existing data is never dropped or rewritten.
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
  product_id         VARCHAR(100) NOT NULL,
  product_sku        VARCHAR(64)  NULL,
  product_name       VARCHAR(255) NOT NULL,
  product_image_path VARCHAR(500) NULL,
  size               VARCHAR(30)  NULL,
  color        VARCHAR(50)  NULL,
  quantity     INT UNSIGNED NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY order_id (order_id),
  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Products — the real catalogue. Product images store only
-- validated local paths (for example /uploads/product-image.jpg).
-- `status` accepts 'draft' | 'published' | 'archived'; only
-- 'published' rows are visible on the public website.
-- `low_stock_threshold` is the per-product "low stock" warning
-- level used by the admin product form and list.
-- `deleted_at` powers the Trash (soft delete). NULL = the product
-- is a normal row. A timestamp = the product was moved to the
-- Trash: the row and its images are kept, the product is hidden
-- from the public website and from normal admin results, and it
-- can be restored with its original status intact.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
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
  deleted_at        DATETIME     NULL,
  -- size_mode decides how the size list behaves:
  --   'standard'        the customer picks a size (at least one is required)
  --   'free_size'       exactly one universal size, always "Free Size"
  --   'not_applicable'  no size at all (tote bags, scarves, accessories)
  -- Existing rows are backfilled from their own size list by the repeatable
  -- migration at the bottom of this file; see server/db/sizeModeMigrations.js.
  size_mode         VARCHAR(20)  NOT NULL DEFAULT 'standard',
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY sku (sku),
  KEY idx_products_status (status),
  KEY idx_products_deleted_at (deleted_at),
  KEY idx_products_size_mode (size_mode),
  KEY idx_products_category (category),
  KEY idx_products_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sizes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED NOT NULL,
  size        VARCHAR(30) NOT NULL,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY product_size (product_id, size),
  CONSTRAINT fk_sizes_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_colours (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(50) NOT NULL,
  hex         CHAR(7) NULL,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY product_colour (product_id, name),
  CONSTRAINT fk_colours_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_seed_markers (
  seed_key  VARCHAR(100) NOT NULL,
  seeded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (seed_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Product reviews — purchased-product reviews plus editorial
-- testimonials.
--
-- A customer proves their purchase with an order number + the
-- checkout email, the server verifies the order was DELIVERED
-- and that the product is on an unreviewed line of that order,
-- checks the rating and the text, and only then is the review
-- stored as 'approved' with source = 'customer'. Only 'approved'
-- rows are ever read by the public API. The owner can later hide,
-- reject, archive, restore or delete a review, and can write
-- their own testimonials with source = 'admin'.
--
-- Safe by design:
--   * product_id / order_id carry NO foreign key on purpose, so
--     archiving, trashing or permanently deleting a product can
--     never destroy a review or fail because of one.
--   * product_name is a snapshot (the same approach order_items
--     uses), so an approved review stays readable even after the
--     product row itself is gone.
--   * order_item_id is the exact order line a customer review
--     belongs to, and UNIQUE(order_item_id) is the real
--     "one review per purchased item" guarantee — two clicks at
--     the same moment cannot both succeed. MySQL allows many
--     NULL values in a unique key, which is exactly what an
--     admin review has.
--   * source separates a real purchase from a testimonial the
--     store wrote for itself. ONLY source = 'customer' reviews
--     feed a product's star rating, so a testimonial can never
--     inflate it. An admin review is always verified_buyer = 0.
--   * order_number / customer_email are NULL-able because an
--     admin review belongs to no order and has no customer.
--   * customer_email is for the admin screen only. It is never
--     part of a public response, and neither is the order number.
--
-- This mirrors server/db/reviewMigrations.js, which brings an
-- existing database to this shape additively and repeatably.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id     INT UNSIGNED NULL,
  product_name   VARCHAR(255) NOT NULL,
  order_id       INT UNSIGNED NULL,
  order_item_id  INT UNSIGNED NULL,
  order_number   VARCHAR(50)  NULL,
  customer_name  VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  review_title   VARCHAR(160) NULL,
  review_text    TEXT         NOT NULL,
  verified_buyer TINYINT(1)   NOT NULL DEFAULT 0,
  source         VARCHAR(20)  NOT NULL DEFAULT 'customer',
  status         ENUM('draft','pending','approved','rejected','hidden','archived') NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_order_item (order_item_id),
  KEY idx_reviews_status (status, created_at),
  KEY idx_reviews_source (source),
  KEY idx_reviews_product (product_id, status),
  KEY idx_reviews_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Discount codes — server-validated percentage discounts.
-- `expires_at` optionally stops a code after a date;
-- `max_uses`/`times_used` optionally cap total redemptions.
-- NEWUSER uses per-email single-use enforcement (checked
-- against the orders table), so its `max_uses` stays NULL.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30) NOT NULL,
  percent_off INT UNSIGNED NOT NULL,
  active      TINYINT(1)  NOT NULL DEFAULT 1,
  expires_at  DATETIME    NULL,
  max_uses    INT UNSIGNED NULL,
  times_used  INT UNSIGNED NOT NULL DEFAULT 0,
  description VARCHAR(160) NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the first-order 15% code.
INSERT INTO discount_codes (code, percent_off, active, description)
VALUES ('NEWUSER', 15, 1, '15% off your first order')
ON DUPLICATE KEY UPDATE code = VALUES(code);

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

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'
    AND COLUMN_NAME = 'product_sku'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE order_items ADD COLUMN product_sku VARCHAR(64) NULL AFTER product_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'
    AND COLUMN_NAME = 'product_image_path'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE order_items ADD COLUMN product_image_path VARCHAR(500) NULL AFTER product_name',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'rating'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE products ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 0.0 AFTER is_sale',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'rating_count'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE products ADD COLUMN rating_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER rating',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'low_stock_threshold'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE products ADD COLUMN low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5 AFTER stock_quantity',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---- Trash (soft delete) migration -------------------------------
-- `deleted_at` is nullable and additive, so this never rewrites or drops an
-- existing table or a single existing product. Products that are already in
-- the catalogue keep deleted_at = NULL and behave exactly as before.
SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'deleted_at'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE products ADD COLUMN deleted_at DATETIME NULL AFTER status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'idx_products_deleted_at'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE products ADD KEY idx_products_deleted_at (deleted_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Product size modes migration (safe + repeatable)
-- --------------------------------------------------------
-- Step 1 adds `products.size_mode` as NULL-able, so the backfill can still tell
-- "never decided" from "the admin deliberately picked standard".
-- Step 2 fills ONLY the NULL rows from each product's own size list:
--   no sizes                -> not_applicable
--   single universal size   -> free_size   (Free Size / Adjustable / One Size)
--   anything else           -> standard
-- Step 3 makes the column NOT NULL with a safe default.
-- The stored size TEXT is never rewritten, so a cap that says "Adjustable"
-- keeps saying "Adjustable". Mirrored by server/db/sizeModeMigrations.js, which
-- runs automatically at backend start.
SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'size_mode'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE products ADD COLUMN size_mode VARCHAR(20) NULL AFTER deleted_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE products p
  LEFT JOIN (
       SELECT product_id,
              COUNT(*) AS size_count,
              MIN(size) AS only_size
         FROM product_sizes
        GROUP BY product_id
      ) s ON s.product_id = p.id
   SET p.size_mode = CASE
         WHEN COALESCE(s.size_count, 0) = 0 THEN 'not_applicable'
         WHEN s.size_count = 1
              AND LOWER(TRIM(s.only_size)) IN ('free size','adjustable','one size','one size fits all')
           THEN 'free_size'
         ELSE 'standard'
       END
 WHERE p.size_mode IS NULL;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'size_mode' AND IS_NULLABLE = 'YES'
);
SET @sql := IF(@cols > 0,
  'ALTER TABLE products MODIFY COLUMN size_mode VARCHAR(20) NOT NULL DEFAULT ''standard''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'idx_products_size_mode'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE products ADD KEY idx_products_size_mode (size_mode)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Additive migrations for discount_codes (validity/usage columns) so a table
-- created before these columns existed is brought up to date safely.
SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_codes'
    AND COLUMN_NAME = 'expires_at'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE discount_codes ADD COLUMN expires_at DATETIME NULL AFTER active',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_codes'
    AND COLUMN_NAME = 'max_uses'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE discount_codes ADD COLUMN max_uses INT UNSIGNED NULL AFTER expires_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cols := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_codes'
    AND COLUMN_NAME = 'times_used'
);
SET @sql := IF(@cols = 0,
  'ALTER TABLE discount_codes ADD COLUMN times_used INT UNSIGNED NOT NULL DEFAULT 0 AFTER max_uses',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;