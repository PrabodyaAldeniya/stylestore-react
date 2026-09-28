/* ========================================================
   STYLESTORE — main App
   --------------------------------------------------------
   Owns all shared state (search, category, sort, cart,
   wishlist, quick-view, toasts) and passes props down.
======================================================== */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";

import "./App.css";

import { fetchProducts } from "./lib/productApi";
import { formatLKR } from "./format";
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

  // ---- Search / filter / sort ----
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("featured");
  const [saleOnly, setSaleOnly] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [catalogReload, setCatalogReload] = useState(0);

  // ---- Wishlist (localStorage-backed) ----
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("styleStoreWishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ---- UI panels ----
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // ---- Toasts ----
  const [toasts, setToasts] = useState([]);

  // ================= SIDE EFFECTS =================

  // Persist wishlist (cart persistence lives in CartContext)
  useEffect(() => {
    localStorage.setItem("styleStoreWishlist", JSON.stringify(wishlist));
  }, [wishlist]);

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
  const shopWomen = () => { setSelectedCategory("Women"); setSaleOnly(false); scrollToProducts(); };
  const shopMen = () => { setSelectedCategory("Men"); setSaleOnly(false); scrollToProducts(); };
  const shopAll = () => { setSelectedCategory("All"); setSaleOnly(false); scrollToProducts(); };
  const shopSale = () => { setSelectedCategory("All"); setSaleOnly(true); scrollToProducts(); };
  const shopCategory = (category) => { setSelectedCategory(category); setSaleOnly(false); scrollToProducts(); };

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

  // ================= WISHLIST LOGIC =================

  const toggleWishlist = (id) => {
    setWishlist((current) => {
      if (current.includes(id)) {
        pushToast("Removed from wishlist", "info");
        return current.filter((w) => w !== id);
      }
      pushToast("Added to wishlist");
      return [...current, id];
    });
  };

  const removeFromWishlist = (id) =>
    setWishlist((current) => current.filter((w) => w !== id));

  const wishlistItems = wishlist
    .map((id) => catalog.find((product) => String(product.id) === String(id)))
    .filter(Boolean);

  // ================= FILTER + SORT =================

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    let result = catalog.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        [product.name, product.sku, product.category, product.productType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesSale = !saleOnly || product.isSale;
      return matchesCategory && matchesSearch && matchesSale;
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
  }, [catalog, saleOnly, searchTerm, selectedCategory, sortOption]);

  // ================= RENDER =================

  return (
    <div className="app">
      {/* ---- Announcement bar ---- */}
      <AnnouncementBar />

      {/* ---- Navbar ---- */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
                {saleOnly ? "Sale" : selectedCategory === "All" ? "New Arrivals" : selectedCategory}
              </h2>
              <p>
                Fresh from the design studio — wear-tested, season-proof and
                ready for your story.
              </p>
            </div>

            <CategoryFilter
              categories={ALL_CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSaleOnly(false);
                scrollToProducts();
              }}
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
              onAddToWishlist={toggleWishlist}
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

      {/* ---- Wishlist drawer ---- */}
      {isWishlistOpen && (
        <div className="drawer-backdrop" onClick={() => setIsWishlistOpen(false)} />
      )}
      <aside className={isWishlistOpen ? "wishlist-drawer open" : "wishlist-drawer"} aria-label="Wishlist">
        <div className="cart-drawer-header">
          <h3>Wishlist ({wishlist.length})</h3>
          <button className="icon-button" onClick={() => setIsWishlistOpen(false)} aria-label="Close wishlist">
            <span style={{ fontSize: 22, lineHeight: 1 }}>×</span>
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="wishlist-empty">
            <p>Your wishlist is empty — tap the heart on any product to save it here.</p>
          </div>
        ) : (
          <ul className="wishlist-items">
            {wishlistItems.map((item) => (
              <li key={item.id} className="wishlist-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <div className="sub">{formatLKR(item.price)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    className="icon-button"
                    onClick={() => handleAddToCart(item)}
                    aria-label={`Add ${item.name} to bag`}
                  >
                    <ShoppingBag size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => removeFromWishlist(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

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