/* ========================================================
   COLOUR CATALOGUE
   --------------------------------------------------------
   One shared source of truth for everything colour-related,
   used by the admin product form AND the storefront.

   The rule this module exists to enforce: the store owner
   only ever sees and types a readable colour NAME. Hex codes
   are an internal detail handled entirely here, so the owner
   never has to know one exists.

   Storage is unchanged — the API and the `product_colours`
   table still receive `{ name, hex }` pairs, so products
   created before this module existed keep working untouched.
   ======================================================== */

/* ========================================================
   1. HEX HELPERS (internal plumbing — never shown in the UI)
   ======================================================== */

/** Accepts 3- or 6-digit hex, in any case. */
export function isHexColour(value) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
}

/** Expands `#abc` to `#aabbcc` and lowercases, so one CSS value works everywhere. */
export function normaliseHex(value) {
  const hex = String(value || "").trim().toLowerCase();
  if (!isHexColour(hex)) return "";
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

/** Shown when a colour has no usable value yet — soft neutral, never invisible. */
export const NEUTRAL_SWATCH = "#e6dccb";

/* ========================================================
   2. PREDEFINED PALETTE
   --------------------------------------------------------
   COLOUR_PRESETS  — the everyday colours every shop needs.
                     These are the main grid in the form.
   EXTRA_PRESETS   — the longer tail, tucked away behind a
                     disclosure so the form stays calm. It
                     deliberately covers the names already in
                     the database so editing an older product
                     highlights the right button.
   ======================================================== */

export const COLOUR_PRESETS = [
  { name: "Black", hex: "#1e1e1e" },
  { name: "White", hex: "#ffffff" },
  { name: "Red", hex: "#d92d20" },
  { name: "Blue", hex: "#2f6fb5" },
  { name: "Green", hex: "#2f8f4e" },
  { name: "Pink", hex: "#f2a1b6" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Yellow", hex: "#f5c518" },
  { name: "Orange", hex: "#e8722c" },
  { name: "Grey", hex: "#8a8a8a" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Ivory", hex: "#f7f1e3" },
  { name: "Cream", hex: "#f3e9d8" },
  { name: "Beige", hex: "#d9c8b8" },
  { name: "Brown", hex: "#6b4a2f" },
  { name: "Maroon", hex: "#7b1e2b" },
  { name: "Wine", hex: "#5c1233" },
  { name: "Mustard", hex: "#d9a441" },
];

export const EXTRA_PRESETS = [
  { name: "Apricot", hex: "#f7c9a3" },
  { name: "Blush", hex: "#ecc9c0" },
  { name: "Butterscotch", hex: "#e0a458" },
  { name: "Cacao", hex: "#7c6a4f" },
  { name: "Camel", hex: "#c1a88b" },
  { name: "Caramel", hex: "#d9a066" },
  { name: "Champagne", hex: "#efe6d8" },
  { name: "Charcoal", hex: "#2b2b2b" },
  { name: "Coffee", hex: "#4a342a" },
  { name: "Dusty Rose", hex: "#c9a0a0" },
  { name: "Ecru", hex: "#e8e4da" },
  { name: "Honey", hex: "#e0b879" },
  { name: "Indigo", hex: "#4b3f8f" },
  { name: "Ink", hex: "#2b2733" },
  { name: "Lavender", hex: "#cbb6f2" },
  { name: "Mushroom", hex: "#8c7a6b" },
  { name: "Oat", hex: "#c1b5a2" },
  { name: "Olive", hex: "#6b7a3a" },
  { name: "Rosewood", hex: "#9c7b6b" },
  { name: "Rust", hex: "#b4531f" },
  { name: "Sand", hex: "#d9c39a" },
  { name: "Sage", hex: "#7fa9a4" },
  { name: "Sky", hex: "#cfe0e3" },
  { name: "Sky Blue", hex: "#7fb2e5" },
  { name: "Slate", hex: "#2f3b47" },
  { name: "Stone", hex: "#a8a29e" },
  { name: "Taupe", hex: "#7a6f66" },
  { name: "Teal", hex: "#167d8c" },
];

/** Every button the form can render, main palette first. */
export const ALL_COLOUR_PRESETS = [...COLOUR_PRESETS, ...EXTRA_PRESETS];

/**
 * Mirrors the server's `MAX_VARIANTS` in `server/validation/product.js`, which
 * silently drops anything beyond it. The form enforces the same ceiling so a
 * selection can never be quietly truncated on save.
 */
export const MAX_COLOURS = 30;

/* ========================================================
   3. NAME → HEX AUTO-MAPPING
   --------------------------------------------------------
   The owner types "Red" (or "light blue denim", or
   "off white") and the app quietly works out a suitable
   internal value. Nothing to memorise, no codes to learn.

   Matching is exact-first, then falls back to the closest
   word we recognise, so "dark navy" and "pale peach" still
   land on a sensible value instead of nothing at all.
   ======================================================== */

/** Everyday synonyms and shades people actually type. */
const COLOUR_ALIASES = {
  black: "Black",
  jet: "Ink",
  ink: "Ink",
  charcoal: "Charcoal",
  slate: "Slate",
  grey: "Grey",
  gray: "Grey",
  stone: "Stone",
  silver: "Stone",
  platinum: "Stone",
  white: "White",
  "off white": "Ivory",
  offwhite: "Ivory",
  ecru: "Ecru",
  ivory: "Ivory",
  cream: "Cream",
  vanilla: "Cream",
  beige: "Beige",
  nude: "Beige",
  sand: "Sand",
  sandy: "Sand",
  tan: "Sand",
  khaki: "Sand",
  taupe: "Taupe",
  mushroom: "Mushroom",
  oat: "Oat",
  oatmeal: "Oat",
  biscuit: "Oat",
  camel: "Camel",
  caramel: "Caramel",
  butterscotch: "Butterscotch",
  champagne: "Champagne",
  cacao: "Cacao",
  cocoa: "Cacao",
  coffee: "Coffee",
  espresso: "Coffee",
  mocha: "Coffee",
  chocolate: "Coffee",
  brown: "Brown",
  "chocolate brown": "Brown",
  cinnamon: "Brown",
  maroon: "Maroon",
  burgundy: "Maroon",
  crimson: "Maroon",
  ruby: "Maroon",
  scarlet: "Red",
  red: "Red",
  poppy: "Red",
  brick: "Rust",
  wine: "Wine",
  merlot: "Wine",
  bordeaux: "Wine",
  "wine red": "Wine",
  rust: "Rust",
  terracotta: "Rust",
  coral: "Rust",
  orange: "Orange",
  tangerine: "Orange",
  apricot: "Apricot",
  peach: "Apricot",
  mustard: "Mustard",
  gold: "Mustard",
  honey: "Honey",
  lemon: "Yellow",
  yellow: "Yellow",
  canary: "Yellow",
  olive: "Olive",
  avocado: "Olive",
  green: "Green",
  emerald: "Green",
  forest: "Green",
  "bottle green": "Green",
  mint: "Sage",
  "mint green": "Sage",
  sage: "Sage",
  pistachio: "Sage",
  teal: "Teal",
  turquoise: "Teal",
  aqua: "Teal",
  "powder blue": "Sky Blue",
  "sky blue": "Sky Blue",
  "baby blue": "Sky Blue",
  "ice blue": "Sky Blue",
  sky: "Sky",
  blue: "Blue",
  "royal blue": "Blue",
  cobalt: "Blue",
  denim: "Blue",
  indigo: "Indigo",
  navy: "Navy",
  "dark blue": "Navy",
  lavender: "Lavender",
  lilac: "Lavender",
  mauve: "Lavender",
  violet: "Purple",
  plum: "Purple",
  purple: "Purple",
  magenta: "Pink",
  fuchsia: "Pink",
  rose: "Dusty Rose",
  "dusty rose": "Dusty Rose",
  blush: "Blush",
  "blush pink": "Pink",
  "hot pink": "Pink",
  "baby pink": "Pink",
  pink: "Pink",
  rosewood: "Rosewood",
};

/** Lowercases, trims and collapses whitespace/hyphens so "Sky-Blue" matches. */
function colourKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palette entry for every preset, keyed by its lookup form. */
const PRESET_BY_KEY = new Map(
  ALL_COLOUR_PRESETS.map((colour) => [colourKey(colour.name), colour])
);

const ALIAS_BY_KEY = new Map(
  Object.entries(COLOUR_ALIASES).map(([key, name]) => [colourKey(key), name])
);

/** The palette entry a typed colour resolves to, or null when unrecognised. */
function presetFor(key) {
  if (!key) return null;
  if (PRESET_BY_KEY.has(key)) return PRESET_BY_KEY.get(key);
  if (ALIAS_BY_KEY.has(key)) {
    return PRESET_BY_KEY.get(colourKey(ALIAS_BY_KEY.get(key))) || null;
  }
  // "dark navy" / "pale peach" — fall back to the closest word we recognise.
  for (const word of key.split(" ")) {
    if (word.length <= 2) continue;
    if (PRESET_BY_KEY.has(word)) return PRESET_BY_KEY.get(word);
    if (ALIAS_BY_KEY.has(word)) {
      return PRESET_BY_KEY.get(colourKey(ALIAS_BY_KEY.get(word))) || null;
    }
  }
  return null;
}

/** The canonical name a typed colour should be stored under, if we know it. */
export function canonicalColourName(name) {
  return presetFor(colourKey(name))?.name || "";
}

/**
 * Turns a typed colour name into the internal hex value the API expects.
 * Returns "" for a name we genuinely do not recognise, which the database
 * and API already allow — the colour is then stored by name alone.
 */
export function resolveColourHex(name) {
  const preset = presetFor(colourKey(name));
  if (preset) return normaliseHex(preset.hex);
  // A pasted colour code still works, but is never asked for or displayed.
  return normaliseHex(name);
}

/* ========================================================
   4. DISPLAY HELPERS (shared by form, preview and storefront)
   ======================================================== */

/**
 * Shades that older products already carry in the database. The catalogue
 * is full of near-miss values (`#f4f4f4` for White, `#30404d` for Navy) that
 * pre-date the palette above, so they are mapped back to a readable name.
 * A colour always prefers its own stored name; this is only the fallback for
 * rows that only ever stored a code.
 */
const LEGACY_HEX_NAMES = {
  "#f4f4f4": "White",
  "#f7f7f7": "White",
  "#2b2b2b": "Charcoal",
  "#2b2b3b": "Ink",
  "#4a6b8a": "Blue",
  "#5f7a94": "Indigo",
  "#cfe0e3": "Sky Blue",
  "#7fb2e5": "Sky Blue",
  "#30404d": "Navy",
  "#1f2a44": "Navy",
  "#5f6f52": "Olive",
  "#ff9fc4": "Pink",
  "#8c7355": "Brown",
  "#cbb493": "Beige",
  "#cbb59a": "Sand",
  "#d9c8b8": "Beige",
  "#e0a458": "Mustard",
  "#d9a441": "Mustard",
  "#efe6d8": "Cream",
  "#e8e0d3": "Cream",
  "#f4efe6": "Ivory",
  "#7c7368": "Taupe",
  "#2f3b47": "Slate",
  "#a8a29e": "Stone",
};

/** Reverse lookup, so a colour stored with only a hex still shows a real name. */
const NAME_BY_HEX = new Map(
  ALL_COLOUR_PRESETS.map((colour) => [normaliseHex(colour.hex), colour.name])
);

for (const [hex, name] of Object.entries(LEGACY_HEX_NAMES)) {
  if (!NAME_BY_HEX.has(hex)) NAME_BY_HEX.set(hex, name);
}

/** "warm white" -> "Warm White", for a free-typed name. */
function titleCaseName(name) {
  return String(name)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Turns a hex into the friendliest name we can offer, or "" if unknown. */
export function readableColourName(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (isHexColour(text)) return NAME_BY_HEX.get(normaliseHex(text)) || "";
  return titleCaseName(text);
}

/**
 * The name to print for a colour. Accepts a `{ name, hex }` pair or a bare
 * string, and copes with legacy rows that only ever stored a colour code.
 *
 * A stored name is always echoed back exactly as it is. It is NOT
 * title-cased or re-mapped here, because this same string is what the
 * storefront sends back as the chosen variant and the API matches it
 * exactly — changing it would break the order.
 */
export function colourLabel(colour) {
  if (!colour) return "";
  if (typeof colour === "string") return readableColourName(colour) || "Colour";
  const name = String(colour.name || "").trim();
  if (name && !isHexColour(name)) return name;
  return readableColourName(colour.hex) || "Colour";
}

/** A CSS background colour for a swatch — never blank, never invalid. */
export function colourSwatch(colour) {
  const hex = typeof colour === "string" ? colour : colour?.hex;
  if (isHexColour(hex)) return normaliseHex(hex);
  const name = typeof colour === "string" ? colour : colour?.name;
  return resolveColourHex(name) || NEUTRAL_SWATCH;
}

/** Case-insensitive match used to highlight the right button for a saved colour. */
export function isSameColourName(left, right) {
  const key = colourKey(left);
  return key !== "" && key === colourKey(right);
}

/** The display name to store for a freshly typed colour, auto-mapped where possible. */
export function normaliseColourName(name) {
  const clean = String(name || "").trim().replace(/\s+/g, " ").slice(0, 50);
  return canonicalColourName(clean) || titleCaseName(clean);
}
