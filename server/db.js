// ========================================
// MySQL connection pool (XAMPP MariaDB).
// Credentials come only from the root .env
// file (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/
// DB_NAME) — never hardcoded, never logged.
// The pool is created lazily so connections
// are only opened when the DB actually needs
// to be used.
// ========================================
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

// ESM evaluates imported modules before the importing file's body runs, so
// `server/index.js`'s dotenv.config() has NOT executed yet when this module
// is evaluated. Load the root .env right here so the DB_* variables are
// always read from the root .env file regardless of import order.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, "..", ".env") });

// Defaults are XAMPP's out-of-the-box values; the root .env is authoritative.
const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mystylestore_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
};

export function createPool() {
  return mysql.createPool(DB_CONFIG);
}

// A single, shared pool for the whole API process.
const pool = createPool();

export default pool;