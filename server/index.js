// ========================================
// StyleStore subscription API
// Express backend that sends welcome emails
// via Gmail/Nodemailer. SMTP credentials live
// only in backend environment variables and
// never reach the browser, source maps or Git.
// ========================================
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Always load the root .env (project root), no matter which folder the
// process is started from (npm scripts run from the project root, but
// this stays robust if someone runs `node server/index.js` elsewhere).
const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, "..", ".env") });

import cors from "cors";
import express from "express";
import helmet from "helmet";

import pool from "./db.js";
import {
  createTransporter,
  isSmtpConfigured,
  verifyTransporter,
} from "./lib/mailer.js";
import subscribeRouter from "./routes/subscribe.js";
import ordersRouter from "./routes/orders.js";
import { initializeDatabase } from "./db/init.js";

const app = express();
const port = Number(process.env.PORT || 3001);

// Explicit CORS allow-list. `CLIENT_ORIGINS` is a comma-separated list;
// `CLIENT_ORIGIN` (singular) is kept as a fallback for older setups.
const configuredOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Any localhost / 127.0.0.1 origin is allowed during development so the
// exact Vite port (5173, 5174, …) never breaks CORS locally.
const isLocalOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin || isLocalOrigin(origin) || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

// Security-first HTTP headers.
app.use(helmet());

// Keep request bodies tiny — we only need email + consent + honeypot,
// plus compact checkout payloads (customer details + cart items).
app.use(express.json({ limit: "64kb" }));

// Health check used by devops / verification. Never reports credentials,
// only whether SMTP and database variables are present.
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    service: "stylestore-email-api",
    smtpConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD),
    databaseConfigured: Boolean(
      process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME
    ),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", subscribeRouter);
app.use("/api", ordersRouter);

// Unknown API routes get a safe JSON 404.
app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "Route not found.",
  });
});

// Central error handler: CORS denials, JSON parse failures, anything else.
// Only safe labels reach the browser; details stay in the server logs.
app.use((err, _req, res, _next) => {
  void _next; // express error middleware signature requires the 4th arg
  if (err?.message === "Origin not allowed by CORS") {
    return res
      .status(403)
      .json({ success: false, code: "CORS_BLOCKED", message: "Origin not allowed." });
  }
  if (err?.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ success: false, code: "INVALID_JSON", message: "Request body is not valid JSON." });
  }
  console.error("Unhandled API error:", err?.message ?? "unknown error");
  res
    .status(500)
    .json({ success: false, code: "INTERNAL_ERROR", message: "Unexpected server error." });
});

app.listen(port, () => {
  console.log(`StyleStore API listening on http://localhost:${port}`);

  // Create the MySQL database + tables on every start (IF NOT EXISTS /
  // additive migrations only, so existing data is never touched).
  initializeDatabase()
    .then(() => console.log(`MySQL schema ready (${process.env.DB_NAME || "mystylestore_db"}: subscribers, orders, order_items, discount_codes).`))
    .catch((error) => {
      console.warn(
        `MySQL schema init failed: ${error?.message ?? "unknown"}. Orders will return a clear error until the database is reachable.`
      );
    });

  // Verify the reusable connection pool actually works at startup — never
  // reports credentials, just a pass/fail for the DB check.
  pool
    .query("SELECT 1")
    .then(() => console.log("MySQL connection verified (connection pool OK)."))
    .catch((error) => {
      console.warn(
        `MySQL connection check failed (${error?.code ?? "unknown"}): check DB_* variables in the root .env. Orders will return a clear error until the database is reachable.`
      );
    });

  // Fail safely at startup when SMTP is missing — the API still starts so
  // /api/health and /api/subscribe can report the problem clearly.
  if (!isSmtpConfigured()) {
    console.warn(
      "SMTP not configured: set SMTP_USER and SMTP_APP_PASSWORD in the root .env to enable welcome emails."
    );
    return;
  }

  verifyTransporter(createTransporter())
    .then(() => console.log("SMTP connection verified (Gmail auth OK)."))
    .catch((error) => {
      const code = error?.code ?? "unknown";
      console.warn(
        `SMTP verification failed (${code}): check SMTP_USER and SMTP_APP_PASSWORD in the root .env.`
      );
    });
});