/* ========================================================
   PRODUCT TAXONOMY — the shared category / product-type list
   --------------------------------------------------------
   StyleStore sells four main categories. Keeping the list in
   one small file means the seed script, the admin API and the
   validation layer all agree on the same names, instead of
   each one keeping its own private list.

   Nothing here is enforced against the database: the
   `products.category` and `products.product_type` columns are
   free text, so products that were created before a type was
   added to this file stay fully editable. The lists below are
   the *recommended* values used by the seed and suggested by
   the admin form.
   ======================================================== */

/* The four main shop categories, in the order they should be
   shown in menus and filter bars. */
export const MAIN_CATEGORIES = ["Women", "Men", "Kids", "Accessories"];

/* Recommended product types for each main category.
   The initial catalogue seed uses exactly these values, so a
   freshly seeded store opens with a clean, sorted filter bar. */
export const PRODUCT_TYPES_BY_CATEGORY = {
  Women: ["Dress", "Blouse", "Top", "Skirt", "Trouser", "Shirt", "Jacket"],
  Men: ["Shirt", "T-Shirt", "Trouser", "Jacket", "Polo Shirt"],
  Kids: [
    "Kids Dress",
    "Kids T-Shirt",
    "Kids Shorts",
    "Kids Jacket",
    "Kids Joggers",
    "Baby Set",
  ],
  Accessories: ["Belt", "Bag", "Scarf", "Cap"],
};

/* Short code used at the start of every seeded SKU.
   e.g. Women + DR001  ->  SS-WOM-DR001 */
export const SKU_PREFIX_BY_CATEGORY = {
  Women: "WOM",
  Men: "MEN",
  Kids: "KID",
  Accessories: "ACC",
};

/** True when `category` is one of the four supported shop categories. */
export function isMainCategory(category) {
  return MAIN_CATEGORIES.includes(String(category || "").trim());
}

/** The recommended product types for a category (empty list if unknown). */
export function productTypesFor(category) {
  return PRODUCT_TYPES_BY_CATEGORY[String(category || "").trim()] || [];
}
