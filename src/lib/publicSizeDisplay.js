/* ============================================
   SECTION: Public size display
   --------------------------------------------------------
   The customer facing view of a product's size mode. This is
   deliberately a *display* concern only:

   · Nothing here writes, normalises or validates anything. The
     internal value stays exactly what sizeModes.js decides and what
     the database stores — "Free Size", a real size, or null.
   · Nothing here reads the size mode differently from sizeModes.js.
     It reuses it, so the label can never disagree with the data.

   A Free Size product used to be shown twice — "SIZE: FREE SIZE"
   next to a "Free Size" button that did nothing — because the one
   value it has was rendered as if it were a choice. getPublicSizeDisplay
   turns that into a single decision for every screen:

     not_applicable  -> kind "hidden"     render the row not at all
     free_size       -> kind "label"      one non-interactive label
     standard        -> kind "selector"   the real size buttons

   The label wording follows what the fit actually is:

     FIT: ADJUSTABLE   a cap, a belt, anything fastened to a range of bodies
     SIZE: ONE SIZE    a scarf, a tote bag, a one-size dress

   How "adjustable" is decided is narrow on purpose. Accessories are not
   blanket-labelled Adjustable — only a product type or name that genuinely
   describes a fitted item, or a product whose own size value literally says
   "Adjustable". A scarf stays a ONE SIZE scarf.
   ============================================ */
import {
  FREE_SIZE_LABEL,
  isUniversalSizeLabel,
  resolveSizeMode,
  selectableSizes,
  SIZE_MODE_FREE_SIZE,
  SIZE_MODE_NOT_APPLICABLE,
  SIZE_MODE_STANDARD,
} from "./sizeModes";

/* ---- The three shapes a size area can take on screen ---- */
export const SIZE_DISPLAY_HIDDEN = "hidden";
export const SIZE_DISPLAY_SELECTOR = "selector";
export const SIZE_DISPLAY_LABEL = "label";

/* ---- Public wording ---- */
export const ONE_SIZE_LABEL = "One Size";
export const ADJUSTABLE_LABEL = "Adjustable";
export const ONE_SIZE_CAPTION = "Size";
export const ADJUSTABLE_CAPTION = "Fit";
export const SELECTABLE_CAPTION = "Size";

/**
 * Product types and name words that describe something *fitted* rather than
 * cut to a single size: headwear with a strap or elastic, buckles and ties,
 * and bags worn on an adjustable strap.
 *
 * Deliberately short. A tote bag is a ONE SIZE product, so a bare "bag" is
 * not in this list — "crossbody" is, because a crossbody is worn on a strap
 * that is adjusted. Words are matched whole and are singularised first, so
 * "Caps", "Belts" and "Baseball Cap" all resolve to the same keywords while
 * "Tie-Dye Shirt" and "Belted Dress" do not.
 */
const ADJUSTABLE_FIT_KEYWORDS = [
  "adjustable",
  // headwear that fastens rather than fits a fixed head size
  "cap",
  "hat",
  "beanie",
  "beret",
  "fedora",
  "trilby",
  "bucket hat",
  "headband",
  // buckles, straps and ties
  "belt",
  "belt bag",
  "braces",
  "suspenders",
  "bow tie",
  "neck tie",
  "cravat",
  "ascot",
  "watchband",
  "watch band",
  // bags worn on an adjustable strap
  "crossbody",
  "cross body",
  "sling",
  "backpack",
];

/**
 * Lower-case, singular word tokens. "Baseball Caps" -> ["baseball", "cap"],
 * "Belted" -> ["belted"] (no match), so keyword matching cannot fire on a
 * fragment of an unrelated word.
 */
function wordTokens(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((word) =>
      word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word
    );
}

function hasKeyword(text, keyword) {
  const tokens = wordTokens(text);
  const parts = keyword.split(" ");
  if (tokens.length < parts.length) return false;
  return tokens.some((_, start) =>
    parts.every((part, offset) => tokens[start + offset] === part)
  );
}

function isAdjustableValue(value) {
  return String(value ?? "").trim().toLowerCase() === "adjustable";
}

/**
 * True when this product's free size is a fit that adjusts to the wearer,
 * rather than one universal size.
 */
function isAdjustableFit(subject) {
  // 1. The product's own size value says so outright. A "Free Size" list is
  //    normalised to ["Free Size"] on the way in and out, so this only fires
  //    for a product whose stored value is still literally "Adjustable".
  if (Array.isArray(subject?.sizes) && subject.sizes.some(isAdjustableValue)) return true;
  if (isAdjustableValue(subject?.size)) return true;

  // 2. The product type, or the name, describes a fitted item. The product
  //    type is the reliable signal on a product record; the name is what
  //    order lines carry, because an order line snapshots the name and no
  //    type. Free-text descriptions are not scanned: they are marketing
  //    copy and would make the label unpredictable.
  return [subject?.productType, subject?.name, subject?.productName].some((text) =>
    ADJUSTABLE_FIT_KEYWORDS.some((keyword) => hasKeyword(text, keyword))
  );
}

/**
 * The size mode to display for this subject.
 *
 * A product carries its own mode. A stored bag line or order line does not
 * — only the internal size value travelled with it — so for those the value
 * itself is the signal: a universal label means Free Size, anything else
 * means a real chosen size, and no value at all means Not Applicable.
 */
function modeFor(subject) {
  if (!subject) return SIZE_MODE_NOT_APPLICABLE;
  if (subject.sizeMode !== undefined && subject.sizeMode !== null) {
    return resolveSizeMode(subject.sizeMode, subject.sizes);
  }
  if (Array.isArray(subject.sizes)) return resolveSizeMode(undefined, subject.sizes);

  const stored = String(subject.size ?? "").trim();
  if (!stored) return SIZE_MODE_NOT_APPLICABLE;
  return isUniversalSizeLabel(stored) ? SIZE_MODE_FREE_SIZE : SIZE_MODE_STANDARD;
}

/** A display with nothing to show, so callers never invent a dash or a blank. */
function hidden(mode) {
  return {
    mode,
    kind: SIZE_DISPLAY_HIDDEN,
    caption: null,
    label: null,
    text: null,
    value: null,
    options: [],
    required: false,
    adjustable: false,
  };
}

/**
 * How this product's size should be shown, as one decision every screen can
 * render. Accepts a product from the API, a bag line, or an order line.
 *
 *   kind     "hidden" | "selector" | "label"  — what to draw
 *   caption  "Size" | "Fit" | null            — the word before the value
 *   label    "One Size" | "Adjustable" | "M" | null
 *   text     the whole thing as one line, or null when there is nothing to say
 *   value    the internal size to store — unchanged by anything here
 *   options  the sizes a customer may actually click, when kind is "selector"
 *   required true when a choice is needed before adding to the bag
 */
export function getPublicSizeDisplay(subject) {
  const mode = modeFor(subject);

  // Not Applicable: the size row is not rendered at all, anywhere.
  if (mode === SIZE_MODE_NOT_APPLICABLE) return hidden(mode);

  // Free Size: one value, no choice. It is a label, never a button, and the
  // value that goes in the bag is still the internal "Free Size".
  if (mode === SIZE_MODE_FREE_SIZE) {
    const adjustable = isAdjustableFit(subject);
    const caption = adjustable ? ADJUSTABLE_CAPTION : ONE_SIZE_CAPTION;
    const label = adjustable ? ADJUSTABLE_LABEL : ONE_SIZE_LABEL;
    return {
      mode,
      kind: SIZE_DISPLAY_LABEL,
      caption,
      label,
      text: `${caption}: ${label}`,
      value: FREE_SIZE_LABEL,
      options: [],
      required: false,
      adjustable,
    };
  }

  // Standard Sizes: the real buttons. `value` is only set when something has
  // already been chosen, so a product that has not been picked from yet does
  // not accidentally claim its first size.
  const chosen = String(subject?.size ?? "").trim();
  return {
    mode,
    kind: SIZE_DISPLAY_SELECTOR,
    caption: SELECTABLE_CAPTION,
    label: chosen || null,
    text: chosen ? `${SELECTABLE_CAPTION} ${chosen}` : null,
    value: chosen || null,
    options: selectableSizes(subject),
    required: true,
    adjustable: false,
  };
}

export default getPublicSizeDisplay;
