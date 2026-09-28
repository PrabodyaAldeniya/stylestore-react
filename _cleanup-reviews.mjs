import pool from "./server/db.js";

const [rows] = await pool.query(
  `SELECT r.id, r.product_id, r.order_number, r.status, o.order_number AS live_order
     FROM product_reviews r LEFT JOIN orders o ON o.id = r.order_id`
);
console.log("reviews:", JSON.stringify(rows, null, 1));

// Remove any leftover harness rows, then report what is left.
for (const row of rows) {
  if (!String(row.order_number).startsWith("SS-20250101-") && !String(row.order_number).includes("REVIEWTEST")) continue;
  if (row.live_order) {
    await pool.execute("DELETE FROM product_reviews WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)", [row.order_number]);
    await pool.execute("DELETE FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)", [row.order_number]);
    await pool.execute("DELETE FROM orders WHERE order_number = ?", [row.order_number]);
  } else {
    await pool.execute("DELETE FROM product_reviews WHERE id = ?", [row.id]);
  }
  await pool.execute("UPDATE products SET rating = 0, rating_count = 0 WHERE id = ?", [row.product_id]);
}
await pool.execute("DELETE FROM products WHERE sku LIKE 'SS-TMP-REV-%'");
const [left] = await pool.query("SELECT COUNT(*) n FROM product_reviews");
const [orders] = await pool.query("SELECT COUNT(*) n FROM orders");
console.log("reviews left:", left[0].n, "orders left:", orders[0].n);
await pool.end();
