/* ========================================================
   PRODUCT SEARCH STATE
   --------------------------------------------------------
   The single place that owns "what is being searched right now"
   for the /products catalogue.

   The URL is the source of truth:

     /products?search=dress&category=Women&sort=price-asc&page=2

   Because the term lives in the URL, a search can be bookmarked,
   shared and reached with the browser Back button, and the navbar
   input can always be re-filled from it.

   This hook also solves the "typing too fast" problem: every request
   gets a number, and a response is only allowed to write to the
   screen if it is still the newest one. Without that, a slow reply
   for "dre" could land after a fast reply for "dress" and show the
   wrong products.
   ======================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { searchProducts } from "./productApi";

/** How many products are shown on one page of results. */
export const PAGE_SIZE = 12;

/** Read one value out of the query string, trimmed. */
function readParam(params, key, fallback = "") {
  const value = params.get(key);
  return value === null || value === undefined ? fallback : String(value).trim();
}

/** Price boxes are free text while typing, so anything odd becomes "". */
function readPrice(params, key) {
  const value = readParam(params, key);
  return /^\d*(\.\d{0,2})?$/.test(value) ? value : "";
}

export function useProductSearch() {
  const [params, setParams] = useSearchParams();

  // ---- Everything currently in the URL, cleaned up ----
  const search = readParam(params, "search");
  const category = readParam(params, "category", "All");
  const productType = readParam(params, "type", "all");
  const sort = readParam(params, "sort", "newest");
  const minPrice = readPrice(params, "min");
  const maxPrice = readPrice(params, "max");
  const page = Math.max(Number(readParam(params, "page", "1")) || 1, 1);

  // A counter that only the "Try again" button touches, so the request
  // effect below re-runs without changing anything the customer can see.
  const [reloadKey, setReloadKey] = useState(0);

  // One string that changes whenever any part of the query changes. The
  // results are stamped with the key they were fetched for, which is what
  // lets the hook report "loading" without an effect having to set it.
  const queryKey = [
    search,
    category,
    productType,
    sort,
    minPrice,
    maxPrice,
    page,
    reloadKey,
  ].join("\u0000");

  // ---- Results state ----
  const [state, setState] = useState({
    status: "loading",
    products: [],
    total: 0,
    error: "",
    key: queryKey,
  });

  // The counter that keeps a slow, old response from overwriting a
  // newer one. It is a ref (not state) because nothing renders from it.
  const latestRequest = useRef(0);

  // ============================================
  // SECTION: Product search request
  // --------------------------------------------------------
  // Runs whenever any filter in the URL changes. The AbortController
  // stops the previous request outright, and the request number is a
  // second belt-and-braces guard in case a response was already on
  // its way when the term changed.
  //
  // The effect never sets state up-front: each response stores the key
  // it was fetched for, and the status is derived below by comparing
  // that key with the current one. Setting "loading" in the effect body
  // instead would force an extra render on every keystroke.
  // ============================================
  useEffect(() => {
    const requestNumber = latestRequest.current + 1;
    latestRequest.current = requestNumber;

    const controller = new AbortController();

    searchProducts(
      {
        page,
        pageSize: PAGE_SIZE,
        search,
        category,
        productType,
        sort,
        minPrice,
        maxPrice,
      },
      { signal: controller.signal }
    )
      .then((result) => {
        // A response from an older search is ignored on purpose.
        if (latestRequest.current !== requestNumber) return;
        setState({
          status: "success",
          products: result.products,
          total: result.total,
          error: "",
          key: queryKey,
        });
      })
      .catch((error) => {
        if (latestRequest.current !== requestNumber) return;
        if (error?.name === "AbortError") return;
        setState({
          status: "error",
          products: [],
          total: 0,
          error: error.message || "The catalogue could not be loaded.",
          key: queryKey,
        });
      });

    return () => controller.abort();
  }, [search, category, productType, sort, minPrice, maxPrice, page, queryKey]);

  // ============================================
  // SECTION: Derived status
  // --------------------------------------------------------
  // While the results on screen belong to an older query, a request for
  // the current one is still in flight. The status flips to "loading" on
  // its own, and any error is dropped until the current query lands.
  // The products already on screen are kept so the grid does not flash
  // empty between two searches.
  // ============================================
  const settled = state.key === queryKey;

  const status = settled ? state.status : "loading";
  const error = settled ? state.error : "";

  // ============================================
  // SECTION: URL updates
  // --------------------------------------------------------
  // Every change writes a clean query string, so the URL always
  // describes exactly what is on screen — no leftover parameters and
  // no page reloads (this is a normal React Router update).
  // ============================================
  const applyParams = useCallback(
    (changes) => {
      const next = new URLSearchParams();
      const current = { search, category, productType, sort, minPrice, maxPrice, page: 1 };
      const merged = { ...current, ...changes };

      if (merged.search) next.set("search", merged.search);
      if (merged.category && merged.category !== "All") next.set("category", merged.category);
      if (merged.productType && merged.productType !== "all") {
        next.set("type", merged.productType);
      }
      if (merged.sort && merged.sort !== "newest") next.set("sort", merged.sort);
      if (merged.minPrice !== "" && merged.minPrice !== null && merged.minPrice !== undefined) {
        next.set("min", String(merged.minPrice));
      }
      if (merged.maxPrice !== "" && merged.maxPrice !== null && merged.maxPrice !== undefined) {
        next.set("max", String(merged.maxPrice));
      }
      // Page 1 is the default, so it is left out of the URL.
      if (Number(merged.page) > 1) next.set("page", String(merged.page));

      setParams(next, { replace: true });
    },
    [search, category, productType, sort, minPrice, maxPrice, setParams]
  );

  /** Run a search from the navbar (Enter or the magnifier). */
  const submitSearch = useCallback(
    (term) => applyParams({ search: String(term || "").trim(), page: 1 }),
    [applyParams]
  );

  /** The cross inside the search box: back to the full collection. */
  const clearSearch = useCallback(
    () => applyParams({ search: "", page: 1 }),
    [applyParams]
  );

  /** Clear the search term AND every other filter in one click. */
  const clearAll = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  const filters = useMemo(
    () => ({ search, category, productType, sort, minPrice, maxPrice, page }),
    [search, category, productType, sort, minPrice, maxPrice, page]
  );

  const hasFilters = Boolean(search) || category !== "All" || productType !== "all" ||
    minPrice !== "" || maxPrice !== "";

  return {
    filters,
    applyParams,
    submitSearch,
    clearSearch,
    clearAll,
    retry,
    hasFilters,
    status,
    products: state.products,
    total: state.total,
    error,
  };
}

export default useProductSearch;
