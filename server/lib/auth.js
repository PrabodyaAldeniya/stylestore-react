import crypto from "node:crypto";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, "..", "..", ".env") });

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const sessionsSecret =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString("hex");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signToken(token) {
  return crypto.createHmac("sha256", sessionsSecret).update(token).digest("base64url");
}

function createHash(password, salt = crypto.randomBytes(16)) {
  const N = 16384;
  const r = 8;
  const p = 1;
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) return reject(error);
        resolve({
          salt: base64url(salt),
          hash: base64url(derivedKey),
          N,
          r,
          p,
        });
      }
    );
  });
}

export async function hashPassword(password) {
  const result = await createHash(password);
  return `scrypt$${result.N}$${result.r}$${result.p}$${result.salt}$${result.hash}`;
}

async function verifyScrypt(password, encoded) {
  const [, n, r, p, saltText, hashText] = String(encoded).split("$");
  const N = Number(n);
  const R = Number(r);
  const P = Number(p);
  if (!N || !R || !P || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      Buffer.from(saltText, "base64url"),
      expected.length,
      { N, r: R, p: P, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key))
    );
  });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function safeEqualText(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAdminConfigured() {
  const passwordConfigured = Boolean(
    process.env.ADMIN_PASSWORD_HASH ||
      (process.env.NODE_ENV !== "production" && process.env.ADMIN_PASSWORD)
  );
  const sessionConfigured =
    process.env.NODE_ENV !== "production" || Boolean(process.env.ADMIN_SESSION_SECRET);
  return Boolean(process.env.ADMIN_USERNAME && passwordConfigured && sessionConfigured);
}

export async function authenticateAdmin(username, password) {
  if (!isAdminConfigured()) return false;
  if (!safeEqualText(username, process.env.ADMIN_USERNAME)) return false;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    try {
      return await verifyScrypt(password, hash);
    } catch {
      return false;
    }
  }
  return safeEqualText(password, process.env.ADMIN_PASSWORD);
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function removeExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
}

function sessionKey(req) {
  removeExpiredSessions();
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || readCookie(req, "stylestore_admin");
  if (!token) return null;
  const [value, signature] = token.split(".");
  if (!value || !signature) return null;
  const expected = signToken(value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return `${value}.${signature}`;
}

export function getAdminSession(req) {
  const key = sessionKey(req);
  const session = key ? sessions.get(key) : null;
  return session && session.expiresAt > Date.now() ? session : null;
}

function sessionCookieAttributes(maxAge) {
  const configured = String(process.env.ADMIN_COOKIE_SAME_SITE || "").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(configured)
    ? configured
    : process.env.NODE_ENV === "production"
      ? "none"
      : "lax";
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  return `Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function startAdminSession(res, username) {
  const token = crypto.randomBytes(32).toString("base64url");
  const key = `${token}.${signToken(token)}`;
  sessions.set(key, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  res.setHeader(
    "Set-Cookie",
    `stylestore_admin=${encodeURIComponent(key)}; ${sessionCookieAttributes(SESSION_TTL_MS / 1000)}`
  );
}

export function endAdminSession(req, res) {
  const key = sessionKey(req);
  if (key) sessions.delete(key);
  res.setHeader(
    "Set-Cookie",
    `stylestore_admin=; ${sessionCookieAttributes(0)}`
  );
}

export function requireAdmin(req, res, next) {
  if (!getAdminSession(req)) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      message: "Please sign in to manage the catalogue.",
    });
  }
  return next();
}

export function getAdminStatus(req) {
  const session = getAdminSession(req);
  return {
    configured: isAdminConfigured(),
    authenticated: Boolean(session),
    username: session?.username || null,
  };
}
