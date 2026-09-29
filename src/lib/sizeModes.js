// ============================================
// SECTION: Product size modes (frontend mirror)
// --------------------------------------------------------
// The browser needs the same three size modes as the server
// (server/lib/sizeModes.js). This file only holds labels and
// tiny helpers so React never repeats a size-mode string.
//
//   standard        the customer must pick a size
//   free_size       one universal size — always "Free Size"
//   not_applicable  no size selector at all
// ============================================

export const SIZE_MODE_STANDARD = "standard";
export const SIZE_MODE_FREE_SIZE = "free_size";
export const SIZE_MODE_NOT_APPLICABLE = "not_applicable";

export const SIZE_MODES = [
  SIZE_MODE_STANDARD,
  SIZE_MODE_FREE_SIZE,
  SIZE_MODE_NOT_APPLICABLE,
];

export const DEFAULT_SIZE_MODE = SIZE_MODE_STANDARD;
export const FREE_SIZE_LABEL = "Free Size";

/** The three options shown in the admin "Size Type" field. */
export const SIZE_MODE_OPTIONS = [
  {
    value: SIZE_MODE_STANDARD,
    label: "Standard Sizes",
    hint: "Dresses, shirts, trousers. The customer chooses a size before adding to the bag.",
  },
  {
    value: SIZE_MODE_FREE_SIZE,
    label: "Free Size",
    hint: "One universal size. We save “Free Size” for you automatically.",
  },
  {
    value: SIZE_MODE_NOT_APPLICABLE,
    label: "Not Applicable",
    hint: "No size is needed, e.g. tote bags and other accessories.",
  },
];

/** Messages the admin form shows under the Size Type field. */
export const FREE_SIZE_NOTICE = "This product will be sold as Free Size.";
export const NOT_APPLICABLE_NOTICE =
  "Customers do not need to select a size for this product.";

/** Safe internal value used when a product genuinely has no size. */
export const NO_SIZE = null;

function cleanSizeList(sizes) {
  return (Array.isArray(sizes) ? sizes : [])
    .map((size) => String(size ?? "").trim())
    .filter(Boolean);
}

/**
 * True for a size value that means "there is no size to choose": the
 * universal labels a product may be sold under. Exported so the customer
 * facing display helper can recognise them without duplicating the list.
 */
export function isUniversalSizeLabel(value) {
  return ["free size", "adjustable", "one size", "one size fits all"].includes(
    String(value ?? "").trim().toLowerCase()
  );
}

/** Guess a mode from a size list — the fallback when a product has no mode. */
export function inferSizeMode(sizes) {
  // A non-array means "we know nothing about this product's sizes", which is
  // not the same as "it has no sizes" — so that falls back to standard and can
  // never quietly turn a real size list into none.
  if (!Array.isArray(sizes)) return DEFAULT_SIZE_MODE;
  const list = cleanSizeList(sizes);
  if (list.length === 0) return SIZE_MODE_NOT_APPLICABLE;
  if (list.length === 1 && isUniversalSizeLabel(list[0])) return SIZE_MODE_FREE_SIZE;
  return SIZE_MODE_STANDARD;
}

/** A valid stored mode always wins, so nothing the admin chose is lost. */
export function resolveSizeMode(storedMode, sizes) {
  const cleaned = String(storedMode ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SIZE_MODES.includes(cleaned) ? cleaned : inferSizeMode(sizes);
}

/**
 * The size list a mode actually stores. This is the one rule the admin form
 * and the API both follow, so a mode and its size list can never disagree:
 *
 *   standard        the sizes as they are
 *   free_size       exactly ["Free Size"]
 *   not_applicable  []
 */
export function applySizeMode(sizeMode, sizes) {
  if (sizeMode === SIZE_MODE_FREE_SIZE) return [FREE_SIZE_LABEL];
  if (sizeMode === SIZE_MODE_NOT_APPLICABLE) return [];
  return cleanSizeList(sizes);
}

/** The mode this product should be treated as. */
export function sizeModeOf(product) {
  if (!product) return SIZE_MODE_NOT_APPLICABLE;
  return resolveSizeMode(product.sizeMode, product.sizes);
}

/**
 * SECTION: Public size selection
 * --------------------------------------------------------
 * The sizes a customer actually sees for this product.
 *
 *   standard        the stored sizes
 *   free_size       ["Free Size"] — one option, chosen automatically
 *   not_applicable  []            — no selector, nothing to show
 * ============================================ */
export function selectableSizes(product) {
  const mode = sizeModeOf(product);
  if (mode === SIZE_MODE_NOT_APPLICABLE) return [];
  if (mode === SIZE_MODE_FREE_SIZE) return [FREE_SIZE_LABEL];
  return cleanSizeList(product?.sizes);
}

/** True when the customer must actively choose before Add to Bag works. */
export function sizeIsRequired(product) {
  return sizeModeOf(product) === SIZE_MODE_STANDARD;
}

/** The size stored on a cart line for this product. */
export function cartSizeFor(product, chosenSize) {
  const mode = sizeModeOf(product);
  if (mode === SIZE_MODE_NOT_APPLICABLE) return NO_SIZE;
  if (mode === SIZE_MODE_FREE_SIZE) return FREE_SIZE_LABEL;
  const chosen = String(chosenSize ?? "").trim();
  return chosen || NO_SIZE;
}

/**
 * What a size area should show, as plain text. Returns null when there is
 * nothing meaningful to display, so callers never render "undefined", an empty
 * dash or an empty selector.
 */
export function sizeSummaryLabel(product) {
  const mode = sizeModeOf(product);
  if (mode === SIZE_MODE_NOT_APPLICABLE) return null;
  if (mode === SIZE_MODE_FREE_SIZE) return FREE_SIZE_LABEL;
  const sizes = selectableSizes(product);
  return sizes.length ? sizes.join(", ") : null;
}