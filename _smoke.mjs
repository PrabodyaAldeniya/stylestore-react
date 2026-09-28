import pool from "./server/db.js";
try {
  const [rows] = await pool.query("SELECT DATABASE() AS db, VERSION() AS v");
  console.log("OK", JSON.stringify(rows[0]));
  const [t] = await pool.query("SHOW TABLES");
  console.log("TABLES:", t.map(r => Object.values(r)[0]).join(", "));
  try {
    const [c] = await pool.query("SELECT COUNT(*) AS n FROM products");
    console.log("products:", c[0].n);
  } catch (e) { console.log("products table missing:", e.code); }
  try {
    const [c] = await pool.query("SELECT COUNT(*) AS n FROM orders");
    console.log("orders:", c[0].n);
  } catch (e) { console.log("orders table missing:", e.code); }
} catch (e) {
  console.log("CONNECT_FAIL", e.code, e.message);
}
await pool.end();
