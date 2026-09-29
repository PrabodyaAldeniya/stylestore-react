/* ========================================================
   STYLESTORE — main App
   --------------------------------------------------------
   Owns all shared state (search, category, sort, cart,
   wishlist, quick-view, toasts) and passes props down.
======================================================== */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./App.css";

import { fetchProducts } from "./lib/productApi";
import { useWishlist } from "./lib/useWishlist";
import { orderProductTypes } from "./lib/adminCatalog";
import { useCart } from "./context/useCart";
// ---- Layout / sections ----
import AnnouncementBar from "./components/AnnouncementBar";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CategoryShowcase from "./components/CategoryShowcase";
import CategoryFilter from "./components/CategoryFilter";
import ProductList from "./components/ProductList";
import ProductQuickView from "./components/ProductQuickView";
import PromoBanner from "./components/PromoBanner";
import Lookbook from "./components/Lookbook";
import Benefits from "./components/Benefits";
import Testimonials from "./components/Testimonials";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import ToastList from "./components/ToastList";
import WishlistDrawer from "./components/WishlistDrawer";

const ALL_CATEGORIES = ["All", "Women", "Men", "Kids", "Accessories"];

function App() {
  const navigate = useNavigate();

  // ---- Cart (context: localStorage-backed, shared with checkout) ----
  const {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  // ---- Wishlist (shared with the /products catalogue page) ----
  const {
    wishlist,
    toggle: toggleWishlist,
    remove: removeFromWishlist,
  } = useWishlist();

  // ---- Search / filter / sort ----
  const [selectedCategory, setSelectedCategory] = useState("All");
  // Product types are the sub-categories of the current main category.
  const [selectedType, setSelectedType] = useState("all");
  const [sortOption, setSortOption] = useState("featured");
  const [saleOnly, setSaleOnly] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [catalogReload, setCatalogReload] = useState(0);

  // ---- UI panels ----
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // ---- Toasts ----
  const [toasts, setToasts] = useState([]);

  // ================= SIDE EFFECTS =================

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((result) => {
        if (cancelled) return;
        setCatalog(result.products || []);
        setCatalogStatus("success");
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalog([]);
        setCatalogError(error.message || "The catalogue could not be loaded.");
        setCatalogStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [catalogReload]);

  // Global scroll-reveal: observe every [data-reveal] /
  // .reveal element (raw className usage in sections) once.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal], .reveal").forEach((el) =>
        el.classList.add("is-visible")
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll("[data-reveal], .reveal").forEach((el) => observer.observe(el));

    // Re-scan late-mounting nodes (quick-view etc.).
    const rescan = new MutationObserver(() => {
      document.querySelectorAll("[data-reveal]:not(.is-visible), .reveal:not(.is-visible)").forEach((el) => observer.observe(el));
    });
    rescan.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      rescan.disconnect();
    };
  }, []);
  // Track scroll so the navbar gains a solid background.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ================= HELPERS =================

  // Push a toast notification (auto-dismiss after 2.6s).
  const pushToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 2600);
  };

  const dismissToast = (id) =>
    setToasts((current) => current.filter((t) => t.id !== id));

  // ================= CART HANDLER =================

  // Wraps the context addToCart so every Add / Add to Bag click:
  //   1. adds the product exactly once (context dedupes on size/colour),
  //   2. instantly opens the existing CartDrawer,
  //   3. confirms with a small "Added to your bag" toast.
  const handleAddToCart = (product, options = {}) => {
    if (product.isOutOfStock || Number(product.stockQuantity) <= 0) {
      pushToast("This piece is currently out of stock", "info");
      return;
    }
    addToCart(product, options);
    setIsCartOpen(true);
    pushToast("Added to your bag");
  };

  const scrollToProducts = () => {
    document
      .getElementById("products")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Handlers used by hero & category cards.
  // Switching the main category always clears the sub-category, otherwise the
  // two filters can combine into a combination that has no products.
  const shopWomen = () => selectCategory("Women");
  const shopMen = () => selectCategory("Men");
  const shopAll = () => selectCategory("All");
  const shopSale = () => {
    selectCategory("All");
    setSaleOnly(true);
    scrollToProducts();
  };
  const shopCategory = (category) => selectCategory(category);

  function selectCategory(category) {
    setSelectedCategory(category);
    setSelectedType("all");
    setSaleOnly(false);
    scrollToProducts();
  }

  // Navbar navigation: filters the catalog for categories,
  // scrolls to the collection for "New In", and lands on the
  // category showcase for "Collections".
  const handleNav = (label) => {
    if (label === "Collections") {
      document
        .getElementById("collections")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (label === "New In") {
      shopAll();
    } else {
      shopCategory(label);
    }
  };

  // ========================================
  // SECTION: Navbar search
  // --------------------------------------------------------
  // Searching from the home page opens the catalogue page with the
  // term in the URL (/products?search=dress). It is a normal
  // client-side navigation, so the browser never reloads the page.
  // ========================================
  const startSearch = (term) => {
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const clearSearch = () => navigate("/products");

  // ================= WISHLIST LOGIC =================

  const handleToggleWishlist = (id) => {
    const added = toggleWishlist(id);
    pushToast(added ? "Added to wishlist" : "Removed from wishlist", added ? "success" : "info");
  };

  const wishlistItems = useMemo(
    () =>
      wishlist
        .map((id) => catalog.find((product) => String(product.id) === String(id)))
        .filter(Boolean),
    [wishlist, catalog]
  );

  // ================= FILTER + SORT =================

  /* Sub-categories are derived from the products that are actually published,
     so every link in the bar leads to a non-empty result. They are scoped to
     the selected main category and follow the admin running order. */
  const productTypes = useMemo(() => {
    const inCategory = catalog.filter(
      (product) => selectedCategory === "All" || product.category === selectedCategory
    );
    return orderProductTypes(
      inCategory.map((product) => product.productType),
      selectedCategory
    );
  }, [catalog, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let result = catalog.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesType =
        selectedType === "all" || product.productType === selectedType;
      const matchesSale = !saleOnly || product.isSale;
      return matchesCategory && matchesType && matchesSale;
    });

    switch (sortOption) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      default:
        result = [...result].sort(
          (a, b) =>
            Number(b.featured || false) - Number(a.featured || false) ||
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
    }

    return result;
  }, [catalog, saleOnly, selectedCategory, selectedType, sortOption]);

  // ================= RENDER =================

  return (
    <div className="app">
      {/* ---- Announcement bar ---- */}
      <AnnouncementBar />

      {/* ---- Navbar ---- */}
      <Navbar
        searchTerm=""
        onSearchSubmit={startSearch}
        onSearchClear={clearSearch}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onNavigate={handleNav}
        scrolled={scrolled}
      />

      <main>
        {/* ---- Hero ---- */}
        <Hero onShopWomen={shopWomen} onShopMen={shopMen} onShopAll={shopAll} />

        {/* ---- Shop by category ---- */}
        <CategoryShowcase onSelectCategory={shopCategory} />

        {/* ---- Products (uses id="products" for scroll target) ---- */}
        <section className="product-section" id="products">
          <div className="product-section-inner">
            <div className="section-heading reveal">
              <span className="eyebrow">THE COLLECTION</span>
              <h2>
                {saleOnly
                  ? "Sale"
                  : selectedType !== "all"
                    ? selectedType
                    : selectedCategory === "All"
                      ? "New Arrivals"
                      : selectedCategory}
              </h2>
              <p>
                Fresh from the design studio — wear-tested, season-proof and
                ready for your story.
              </p>
            </div>

            <CategoryFilter
              categories={ALL_CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => selectCategory(cat)}
              productTypes={productTypes}
              selectedType={selectedType}
              onSelectType={setSelectedType}
              sortOption={sortOption}
              onSortChange={setSortOption}
              productCount={filteredProducts.length}
            />

            <ProductList
              products={filteredProducts}
              status={catalogStatus}
              error={catalogError}
               onRetry={() => {
                 setCatalogStatus("loading");
                 setCatalogError("");
                 setCatalogReload((value) => value + 1);
               }}
              wishlist={wishlist}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleToggleWishlist}
              onRemoveFromWishlist={removeFromWishlist}
              onQuickView={setQuickViewProduct}
            />
          </div>
        </section>

        {/* ---- Promo band ---- */}
        <PromoBanner onShopSale={shopSale} />

        {/* ---- Lookbook ---- */}
        <Lookbook />

        {/* ---- Benefits ---- */}
        <Benefits />

        {/* ---- Testimonials ---- */}
        <Testimonials />

        {/* ---- Newsletter ---- */}
        <Newsletter />
      </main>

      {/* ---- Footer ---- */}
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

      {/* ---- Wishlist drawer (shared with the search page) ---- */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onAddToCart={handleAddToCart}
        onRemoveFromWishlist={removeFromWishlist}
      />

      {/* ---- Quick view ---- */}
      {quickViewProduct && (
        <ProductQuickView
          key={quickViewProduct.id}
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToBag={handleAddToCart}
        />
      )}

      {/* ---- Toasts ---- */}
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
