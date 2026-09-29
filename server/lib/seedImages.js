/* ========================================================
   SEED IMAGE SAFETY
   --------------------------------------------------------
   THE BUSINESS OWNER MUST UPLOAD THE ORIGINAL StyleStore
   PRODUCT PHOTOGRAPHS BEFORE PRODUCTION DEPLOYMENT.
   Every product created by `npm run seed:products` ships with
   no photo on purpose, and the storefront shows a clean
   "Photo to be added" placeholder until a real photograph is
   attached from Admin > Products > Edit.

   The initial catalogue is created from typed-in data, not from
   photographs. StyleStore therefore refuses to invent image
   paths: a path is only ever used when the file genuinely
   exists inside `server/uploads/`.

   Everything else is left empty on purpose. The storefront's
   existing `ProductImage` component (src/components/ProductCard.jsx)
   already renders that placeholder when a product has no image
   row, cards keep their height, and the owner can attach a real
   photo at any time from Admin > Products > Edit, using the
   normal image uploader.

   This is also why no remote Google / stock image URLs are used
   anywhere: they would break, they would not belong to
   StyleStore, and they are not what the business is selling.
   ======================================================== */

import fs from "node:fs";
import path from "node:path";

import { UPLOAD_DIR, UPLOAD_PREFIX } from "./uploads.js";

/* Shown in the seed summary so the owner knows exactly what to do. */
export const PLACEHOLDER_NOTICE =
  "Seeded products ship without a photo. Open Admin > Products > Edit on any product and upload the original StyleStore photograph before going live.";

/**
 * True when `imagePath` points at a real file inside `server/uploads`.
 *
 * Guards against three things:
 *   1. an absolute or remote URL (never stored, never rendered),
 *   2. path traversal such as `../../.env`,
 *   3. a path that looks right but has no file behind it.
 */
export function localUploadExists(imagePath) {
  const value = String(imagePath || "").trim();
  if (!value.startsWith(`${UPLOAD_PREFIX}/`)) return false;
  if (/^(?:https?:|data:|javascript:|\/\/)/i.test(value)) return false;

  // `path.basename` drops any directory part, so `../../secret` becomes
  // `secret` and can only ever resolve inside UPLOAD_DIR.
  const filename = path.basename(value);
  if (!filename) return false;

  try {
    return fs.statSync(path.join(UPLOAD_DIR, filename)).isFile();
  } catch {
    return false;
  }
}

/**
 * Decide which image a seed record should use.
 *
 * @returns {string|null} a safe `/uploads/...` path, or null to use the
 *   clean placeholder shown by the storefront.
 */
export function resolveSeedImage(candidate) {
  return localUploadExists(candidate) ? String(candidate).trim() : null;
}

/** Alt text stored with a seed image, falling back to the product name. */
export function seedAltText(product) {
  return `${String(product?.name || "StyleStore product").trim()} - StyleStore`;
}
