/* ========================================================
   PRODUCT CATALOGUE PAGE  —  /products
   --------------------------------------------------------
   The page the navbar search box leads to.

   Everything on screen is driven by the URL:

     /products?search=dress&category=Women&type=Dresses&sort=price-asc&page=2

   That is what makes a search shareable, bookmarkable and safe with
   the browser Back button — and it means nothing here ever reloads
   the whole browser page.

   The list itself is produced by the DATABASE (GET /api/products),
   not by filtering an in-browser copy, so only published products
   that really match the term are ever shown. Draft, archived and
   trashed products are filtered out by the server query.
   ======================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, PackageSearch, RotateCcw } from "lucide-react";

import AnnouncementBar from "../components/AnnouncementBar";
import Navbar from "../components/Navbar";
import ProductList from "../components/ProductList";
import ProductQuickView from "../components/ProductQuickView";
import ToastList from "../components/ToastList";
import WishlistDrawer from "../components/WishlistDrawer";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";

import { useCart } from "../context/useCart";
import { useWishlist } from "../lib/useWishlist";
import { useProductSearch, PAGE_SIZE } from "../lib/useProductSearch";
import { fetchProductFacets } from "../lib/productApi";

/* ========================================================
   1. SMALL PRESENTATION HELPERS
   ======================================================== */
const CATEGORY_LABELS = {
  All: "All",
  Women: "Women",
  Men: "Men",
  Kids: "Kids",
  Accessories: "Accessories",
};

/** "dress" -> “dress” — used to echo the term back to the customer. */
function quoted(text) {
  return `\u201C${text}\u201D`;
}

/* ========================================================
   2. PRODUCT CATALOGUE PAGE
   ======================================================== */
export default function ProductsPage() {
  const navigate = useNavigate();

  // ---- Search, filters, sort, pagination (all URL driven) ----
  const {
    filters,
    applyParams,
    submitSearch,
    clearSearch,
    clearAll,
    retry,
    hasFilters,
    status,
    products,
    total,
    error,
  } = useProductSearch();

  // ---- Cart (the same context the home page and checkout use) ----
  const { cartItems, cartCount, cartTotal, addToCart, increaseQuantity, decreaseQuantity, removeFromCart } =
    useCart();

  // ---- Wishlist (shared with the home page through localStorage) ----
  const { wishlist, toggle: toggleWishlist, remove: removeFromWishlist } = useWishlist();

  // ---- Panels + toasts ----
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  // Category → product-type options, straight from the database.
  const [facets, setFacets] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchProductFacets()
      .then((categories) => {
        if (!cancelled) setFacets(categories);
      })
      .catch(() => {
        // A missing filter bar must never hide the search results.
        if (!cancelled) setFacets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track scroll so the navbar gains its solid background.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pushToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const handleAddToCart = (product, options = {}) => {
    if (product.isOutOfStock || Number(product.stockQuantity) <= 0) {
      pushToast("This piece is currently out of stock", "info");
      return;
    }
    addToCart(product, options);
    setIsCartOpen(true);
    pushToast("Added to your bag");
  };

  const handleToggleWishlist = (id) => {
    const added = toggleWishlist(id);
    pushToast(added ? "Added to wishlist" : "Removed from wishlist", added ? "success" : "info");
  };

  // The wishlist drawer needs product details, which only the loaded
  // results know about — so it shows whatever of the saved ids we can
  // still see. Unknown ids simply do not appear.
  const wishlistItems = useMemo(
    () =>
      wishlist
        .map((id) => products.find((product) => String(product.id) === String(id)))
        .filter(Boolean),
    [wishlist, products]
  );

  /* ============================================
     3. DERIVED FILTER OPTIONS
     ============================================ */
  const categories = useMemo(() => {
    const names = facets.map((entry) => entry.category).filter(Boolean);
    return ["All", ...names.filter((name) => name !== "All")];
  }, [facets]);

  const productTypes = useMemo(() => {
    const entry = facets.find((item) => item.category === filters.category);
    return entry ? entry.productTypes.map((item) => item.productType) : [];
  }, [facets, filters.category]);

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const goToPage = useCallback(
    (nextPage) => applyParams({ page: Math.min(Math.max(nextPage, 1), pageCount) }),
    [applyParams, pageCount]
  );

  /* ============================================
     4. NAVIGATION FROM THE NAVBAR
     ============================================ */
  const handleNav = (label) => {
    if (label === "Collections") {
      clearAll();
      return;
    }
    if (label === "New In") {
      applyParams({ category: "All", productType: "all", page: 1 });
      return;
    }
    applyParams({ category: label, productType: "all", page: 1 });
  };

  /* ============================================
     5. RENDER
     ============================================ */
  const resultSummary = filters.search
    ? `${total} product${total === 1 ? "" : "s"} found for ${quoted(filters.search)}`
    : `${total} product${total === 1 ? "" : "s"}`;

  return (
    <div className="app">
      <AnnouncementBar />

      <Navbar
        searchTerm={filters.search}
        onSearchSubmit={submitSearch}
        onSearchClear={clearSearch}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onNavigate={handleNav}
        scrolled={scrolled}
      />

      <main>
        <section className="product-section search-page" id="products">
          <div className="product-section-inner">
            {/* ---- Page heading ---- */}
            <div className="section-heading reveal">
              <span className="eyebrow">
                {filters.search ? "SEARCH RESULTS" : "THE COLLECTION"}
              </span>
              <h2>
                {filters.search
                  ? `Results for ${filters.search}`
                  : CATEGORY_LABELS[filters.category] || filters.category}
              </h2>
              <p aria-live="polite" className="search-page-summary">
                {status === "loading"
                  ? "Searching the collection…"
                  : status === "error"
                    ? "The search service is unavailable right now."
                    : resultSummary}
              </p>
            </div>

            {/* ============================================
                FILTER BAR
                Category · product type · price · sort · clear.
                Every control writes to the URL, so search and
                filters always work together.
                ============================================ */}
            <section className="search-toolbar" aria-label="Filter and sort search results">
              <div className="search-toolbar-row">
                <span className="filter-label">CATEGORY</span>
                <div className="category-pills">
                  {categories.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={filters.category === name ? "category-pill active" : "category-pill"}
                      aria-pressed={filters.category === name}
                      onClick={() =>
                        applyParams({ category: name, productType: "all", page: 1 })
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {productTypes.length > 0 && (
                <div className="search-toolbar-row">
                  <span className="filter-label">COLLECTION</span>
                  <div className="category-pills">
                    <button
                      type="button"
                      className={filters.productType === "all" ? "category-pill active" : "category-pill"}
                      aria-pressed={filters.productType === "all"}
                      onClick={() => applyParams({ productType: "all", page: 1 })}
                    >
                      All
                    </button>
                    {productTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={
                          filters.productType === type ? "category-pill active" : "category-pill"
                        }
                        aria-pressed={filters.productType === type}
                        onClick={() => applyParams({ productType: type, page: 1 })}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="search-toolbar-row search-toolbar-row--controls">
                {/* ---- Price filter ---- */}
                <div className="search-price">
                  <span className="filter-label">PRICE (LKR)</span>
                  <label className="search-price-input">
                    <span className="rv-sr-only">Minimum price</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(event) =>
                        applyParams({ minPrice: event.target.value.replace(/[^\d.]/g, ""), page: 1 })
                      }
                    />
                  </label>
                  <span aria-hidden="true">–</span>
                  <label className="search-price-input">
                    <span className="rv-sr-only">Maximum price</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(event) =>
                        applyParams({ maxPrice: event.target.value.replace(/[^\d.]/g, ""), page: 1 })
                      }
                    />
                  </label>
                </div>

                {/* ---- Sort ---- */}
                <div className="search-sort">
                  <span className="filter-label">SORT</span>
                  <label className="sort-select">
                    <span className="sr-only">Sort products</span>
                    <select
                      value={filters.sort}
                      onChange={(event) => applyParams({ sort: event.target.value, page: 1 })}
                    >
                      <option value="newest">Newest</option>
                      <option value="name">Name A–Z</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="featured">Featured</option>
                    </select>
                  </label>
                </div>

                {hasFilters && (
                  <button type="button" className="secondary-button search-clear-all" onClick={clearAll}>
                    <RotateCcw size={14} aria-hidden /> Clear all filters
                  </button>
                )}
              </div>
            </section>

            {/* ---- Results ---- */}
            <ProductList
              products={products}
              status={status}
              error={error}
              onRetry={retry}
              wishlist={wishlist}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleToggleWishlist}
              onRemoveFromWishlist={removeFromWishlist}
              onQuickView={setQuickViewProduct}
              emptyState={
                <div className="products-empty">
                  <span className="empty-icon">
                    <PackageSearch size={30} />
                  </span>
                  <h3>No products found</h3>
                  <p>
                    {filters.search
                      ? `Nothing matched ${quoted(filters.search)}. Try a shorter word, a different spelling, or search by category, type or colour.`
                      : "No products match the filters you picked. Try widening them."}
                  </p>
                  <div className="products-empty-actions">
                    {filters.search && (
                      <button type="button" className="primary-button" onClick={clearSearch}>
                        Clear search
                      </button>
                    )}
                    {hasFilters && (
                      <button type="button" className="secondary-button" onClick={clearAll}>
                        Clear all filters
                      </button>
                    )}
                    <Link to="/" className="secondary-button">
                      Back to home
                    </Link>
                  </div>
                </div>
              }
            />

            {/* ---- Pagination (URL driven, no page reload) ---- */}
            {status === "success" && total > PAGE_SIZE && (
              <nav className="search-pagination" aria-label="Search results pages">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => goToPage(filters.page - 1)}
                  disabled={filters.page <= 1}
                >
                  <ChevronLeft size={15} aria-hidden /> Previous
                </button>

                <span aria-live="polite">
                  Page {filters.page} of {pageCount}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => goToPage(filters.page + 1)}
                  disabled={filters.page >= pageCount}
                >
                  Next <ChevronRight size={15} aria-hidden />
                </button>
              </nav>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* ---- Cart drawer ---- */}
      {isCartOpen && <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)} />}
      <CartDrawer
        isOpen={isCartOpen}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onClose={() => setIsCartOpen(false)}
        onIncrease={increaseQuantity}
        onDecrease={decreaseQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate("/checkout");
        }}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onAddToCart={handleAddToCart}
        onRemoveFromWishlist={removeFromWishlist}
      />

      {quickViewProduct && (
        <ProductQuickView
          key={quickViewProduct.id}
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToBag={handleAddToCart}
        />
      )}

      <ToastList
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
    </div>
  );
}
