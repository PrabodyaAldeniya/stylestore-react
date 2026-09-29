// ============================================
// SECTION: Product size modes
// --------------------------------------------------------
// Every StyleStore product belongs to exactly ONE size mode.
//
//   standard        dresses, shirts, trousers …
//                   At least one size is required. The customer picks one.
//
//   free_size       one universal size ("Free Size").
//                   The size list is normalised to exactly ["Free Size"], so
//                   the admin never has to type one and the customer never has
//                   to choose one.
//
//   not_applicable  tote bags, scarves, accessories where a size is
//                   meaningless. The size list is stored empty.
//
// These three strings are the ONLY values accepted anywhere. Every other
// module imports them from here instead of repeating the literals, so a typo
// can never create a fourth mode.
// ============================================

/** Standard, customer-chosen sizes (XS / S / 28 / 32 …). */
export const SIZE_MODE_STANDARD = "standard";

/** One universal size. Normalised to exactly ["Free Size"]. */
export const SIZE_MODE_FREE_SIZE = "free_size";

/** No size at all. The size list is stored empty. */
export const SIZE_MODE_NOT_APPLICABLE = "not_applicable";

/** Every supported size mode, in the order the admin form shows them. */
export const SIZE_MODES = [
  SIZE_MODE_STANDARD,
  SIZE_MODE_FREE_SIZE,
  SIZE_MODE_NOT_APPLICABLE,
];

/** Used when nothing better is known (old rows, missing column value). */
export const DEFAULT_SIZE_MODE = SIZE_MODE_STANDARD;

/** The one and only size text a free_size product ever carries. */
export const FREE_SIZE_LABEL = "Free Size";

/**
 * Size texts that already mean "one universal size". Used only to recognise
 * an existing catalogue when a mode has to be guessed — never to rewrite a
 * product.
 */
export const UNIVERSAL_SIZE_LABELS = [
  "free size",
  "adjustable",
  "one size",
  "one size fits all",
];

/** True when `value` is one of the three supported modes. */
export function isSizeMode(value) {
  return SIZE_MODES.includes(value);
}

/**
 * Turn whatever arrived in a request into a size mode.
 * Accepts "free_size", "Free Size" and "free-size" so the admin form can send
 * a readable label. Returns null for anything unknown, which is how the
 * validation layer rejects a bad mode.
 */
export function parseSizeMode(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return isSizeMode(cleaned) ? cleaned : null;
}

/** True when the size text is one of the universal single-size labels. */
export function isUniversalSizeLabel(value) {
  return UNIVERSAL_SIZE_LABELS.includes(String(value ?? "").trim().toLowerCase());
}

/**
 * Guess a size mode from a product's own size list. Used by the migration to
 * place existing products in the right mode, and as a safe fallback when an
 * older row has no stored mode at all.
 *
 * A `sizes` value that is not an array at all means "we know nothing about this
 * product's sizes" — not "this product has no sizes" — so that case falls back
 * to standard and never silently turns a real size list into none.
 */
export function inferSizeMode(sizes) {
  if (!Array.isArray(sizes)) return DEFAULT_SIZE_MODE;
  const list = sizes.map((size) => String(size ?? "").trim()).filter(Boolean);
  if (list.length === 0) return SIZE_MODE_NOT_APPLICABLE;
  if (list.length === 1 && isUniversalSizeLabel(list[0])) return SIZE_MODE_FREE_SIZE;
  return SIZE_MODE_STANDARD;
}

/**
 * The mode a product should actually be treated as: a valid stored mode always
 * wins, so a manually chosen mode is never overwritten by a guess.
 */
export function resolveSizeMode(storedMode, sizes) {
  const parsed = parseSizeMode(storedMode);
  return parsed || inferSizeMode(sizes);
}

/**
 * SECTION: Free Size normalization
 * --------------------------------------------------------
 * The single place that turns (mode + submitted sizes) into the list that is
 * actually stored, so the admin form, the API and the seed script can never
 * disagree:
 *
 *   standard        the submitted sizes, unchanged
 *   free_size       exactly ["Free Size"]
 *   not_applicable  []
 * ============================================ */
export function applySizeMode(sizeMode, sizes) {
  if (sizeMode === SIZE_MODE_FREE_SIZE) return [FREE_SIZE_LABEL];
  if (sizeMode === SIZE_MODE_NOT_APPLICABLE) return [];
  return Array.isArray(sizes) ? sizes : [];
}