/* ========================================================
   INITIAL CATALOGUE SEED RUNNER
   --------------------------------------------------------
   Run it manually whenever you want the starter catalogue:

       npm run seed:products

   It is deliberately NOT part of server startup. Nothing in
   `server/index.js` imports this file, so restarting the API
   will never insert products on its own.

   What it does, in order:
     1. checks the seed data itself (unique SKUs, unique names,
        category + product-type combos, no negative stock)
     2. for each product, checks MySQL for the same SKU or the
        same product name — if either already exists the product
        is SKIPPED, never overwritten
     3. inserts the rest through the existing product repository,
        one transaction per product, so a single bad row can be
        rolled back without touching anything else
     4. prints a short summary

   What it never does: delete rows, truncate tables, reset
   auto-increment IDs, or touch orders, order items, reviews or
   uploaded images.
   ======================================================== */

import pool from "../db.js";
import { addProductImage, createProduct } from "../repositories/products.js";
import { validateProduct } from "../validation/product.js";
import { isMainCategory, productTypesFor } from "../lib/productTaxonomy.js";
import { PLACEHOLDER_NOTICE, resolveSeedImage, seedAltText } from "../lib/seedImages.js";
import seedProducts from "./seedProductData.js";

/** Every seeded product starts published so it appears in the shop straight away. */
const DEFAULT_STATUS = "published";

/** Low-stock warning level used for the starter catalogue. */
const DEFAULT_LOW_STOCK = 5;

// ============================================
// SECTION: Duplicate protection
// --------------------------------------------------------
// Two kinds of duplicates matter:
//   * inside this file — caught before we touch the database
//   * inside MySQL      — caught before each insert
// Both checks are case-insensitive on the name so "Floral Midi
// Dress" and "floral midi dress" are treated as the same
// product.
// ============================================

/** Checks the seed file itself. Throws so a bad data file never half-runs. */
function assertSeedDataIsClean(products) {
  const seenSkus = new Map();
  const seenNames = new Map();
  const problems = [];

  for (const product of products) {
    const sku = String(product.sku || "").trim().toUpperCase();
    const name = String(product.name || "").trim().toLowerCase();

    if (seenSkus.has(sku)) problems.push(`Duplicate SKU in seed data: ${sku}`);
    if (seenNames.has(name)) problems.push(`Duplicate name in seed data: ${product.name}`);
    seenSkus.set(sku, product.name);
    seenNames.set(name, product.name);

    if (!isMainCategory(product.category)) {
      problems.push(`${sku}: unsupported category "${product.category}"`);
    }
    if (!productTypesFor(product.category).includes(product.productType)) {
      problems.push(`${sku}: unsupported product type "${product.productType}"`);
    }
    if (Number(product.stockQuantity) < 0) {
      problems.push(`${sku}: stock must never be negative`);
    }
  }

  if (problems.length) {
    throw new Error(`Seed data is not valid:\n  - ${problems.join("\n  - ")}`);
  }
}

/**
 * Looks for an existing product with the same SKU or the same name.
 * Returns the row that already owns it, or null when it is safe to insert.
 */
async function findExistingProduct(connection, product) {
  const [rows] = await connection.query(
    `SELECT id, sku, name
       FROM products
      WHERE sku = ?
         OR LOWER(name) = LOWER(?)
      LIMIT 1`,
    [String(product.sku).trim().toUpperCase(), String(product.name).trim()]
  );
  return rows[0] || null;
}

// ============================================
// SECTION: Product insertion
// --------------------------------------------------------
// Each product is written inside its own transaction using the
// project's shared connection pool and the same repository
// function the admin "Add Product" button uses, so seeded
// products are validated and shaped exactly like typed ones.
// ============================================

async function insertSeedProduct(product) {
  // Reuse the Add Product form's validation. It rejects a bad SKU,
  // a non-positive price, an original price below the selling price,
  // a missing size or colour list, and so on.
  const data = validateProduct({
    sku: product.sku,
    name: product.name,
    category: product.category,
    productType: product.productType,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold ?? DEFAULT_LOW_STOCK,
    sizes: product.sizes,
    colours: product.colours,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
    // The repository sets this itself when the original price is
    // higher than the selling price, so it can never disagree
    // with the numbers.
    isSale: Boolean(product.originalPrice) && product.originalPrice > product.price,
    rating: product.rating ?? 0,
    ratingCount: product.ratingCount ?? 0,
    status: DEFAULT_STATUS,
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const existing = await findExistingProduct(connection, product);
    if (existing) {
      await connection.rollback();
      return { inserted: false, skipped: true, failed: false, reason: existing };
    }

    const saved = await createProduct(data, connection);

    // ----------------------------------------------------
    // IMAGES
    // ----------------------------------------------------
    // No photograph is invented for a seeded product. A path is
    // only written when the file genuinely exists inside
    // server/uploads; otherwise no image row is created and the
    // storefront shows its existing clean "Photo to be added"
    // placeholder until the business owner uploads the real
    // StyleStore photograph through Admin > Products > Edit.
    const imagePath = resolveSeedImage(product.image);
    if (imagePath) {
      await addProductImage(
        saved.id,
        { path: imagePath, altText: seedAltText(product), sortOrder: 0, isPrimary: true },
        connection
      );
    }

    await connection.commit();
    return { inserted: true, skipped: false, failed: false, product: saved };
  } catch (error) {
    // Roll back only this product. Everything already committed
    // stays exactly as it is.
    try {
      await connection.rollback();
    } catch {
      /* the connection is already unusable; nothing to undo */
    }
    return { inserted: false, skipped: false, failed: true, reason: error };
  } finally {
    connection.release();
  }
}

// ============================================
// SECTION: Seed result summary
// ============================================
async function main() {
  console.log("============================================");
  console.log(" StyleStore - initial catalogue seed");
  console.log("============================================\n");

  try {
    assertSeedDataIsClean(seedProducts);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const inserted = [];
  const skipped = [];
  const failed = [];

  for (const product of seedProducts) {
    // Sequential on purpose: each product gets its own transaction, and
    // running them one at a time keeps the summary output readable.
    const result = await insertSeedProduct(product);

    if (result.inserted) {
      inserted.push(product);
      console.log(`  + added    ${product.sku}  ${product.name}`);
    } else if (result.skipped) {
      skipped.push(product);
      console.log(`  = skipped  ${product.sku}  ${product.name}`);
      console.log(
        `            already exists as "${result.reason.name}" (${result.reason.sku})`
      );
    } else {
      failed.push(product);
      console.error(`  ! failed   ${product.sku}  ${product.name}`);
      console.error(`            ${result.reason.message}`);
    }
  }

  const byCategory = seedProducts.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});

  console.log("\n============================================");
  console.log(" Seed result");
  console.log("============================================");
  console.log(`  Products inserted : ${inserted.length}`);
  console.log(`  Products skipped   : ${skipped.length}`);
  console.log(`  Products failed    : ${failed.length}`);
  console.log("\n  Catalogue distribution:");
  for (const category of ["Women", "Men", "Kids", "Accessories"]) {
    const addedHere = inserted.filter((product) => product.category === category).length;
    console.log(
      `    ${category.padEnd(12)} ${String(byCategory[category]).padStart(2)} products ` +
        `(${addedHere} added this run)`
    );
  }
  console.log(`\n  ${PLACEHOLDER_NOTICE}`);
  console.log("============================================\n");

  if (failed.length) process.exitCode = 1;
}

await main();
await pool.end();
