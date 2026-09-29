import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Menu,
  ReceiptText,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

/* ========================================
   NAVBAR — logo, links, search, icons
   ======================================== */
function Navbar({
  searchTerm = "",
  onSearchSubmit,
  onSearchClear,
  wishlistCount,
  cartCount,
  onOpenCart,
  onOpenWishlist,
  onNavigate,
  scrolled,
}) {
  // Mobile hamburger menu state.
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // ========================================
  // SECTION: Search form state
  // --------------------------------------------------------
  // `draft` is what the customer has typed; `searchTerm` is the term
  // that has actually been searched (it comes from the URL). Keeping
  // them apart means the input never fights the page: typing does not
  // search, submitting does, and the input still shows the live term
  // once the results are on screen.
  // ========================================
  const [draft, setDraft] = useState(searchTerm);

  // When the URL term changes (back button, a category link, a search
  // that ran from another page) the input follows it.
  //
  // This is adjusted during render rather than in an effect: `lastTerm`
  // records the prop the draft was built from, so a changed prop re-syncs
  // the input in the same render instead of triggering a second pass. An
  // effect here would be a redundant re-render on every search.
  const [lastTerm, setLastTerm] = useState(searchTerm);
  if (lastTerm !== searchTerm) {
    setLastTerm(searchTerm);
    setDraft(searchTerm);
  }

  // Submitting: trim the spaces, then hand the term to the page.
  // Pressing Enter in the input and clicking the magnifier both land
  // here, because the input and the icon live inside one <form>.
  const submitSearch = (event) => {
    event.preventDefault();
    const cleanTerm = draft.trim();
    if (!cleanTerm) {
      clearSearch();
      return;
    }
    onSearchSubmit?.(cleanTerm);
  };

  // The little cross inside the input: empties the box AND the results.
  const clearSearch = () => {
    setDraft("");
    onSearchClear?.();
  };

  // Active link + navigation handler. Keeps the header in sync
  // with where the user is on the page.
  const NAV_ITEMS = ["New In", "Women", "Men", "Kids", "Collections"];
  const [activeLink, setActiveLink] = useState("New In");

  const go = (label) => {
    setActiveLink(label);
    setMenuOpen(false);
    // Wait a frame so the drawer closes and the body scroll lock is
    // released before the smooth scrollIntoView runs.
    requestAnimationFrame(() => {
      document.body.style.overflow = "";
      onNavigate?.(label);
    });
  };


  // While the mobile drawer is open: lock background scroll and
  // close it when Escape is pressed.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      {/* ========================================
          STICKY NAVIGATION HEADER
          (transparent over the hero; turns solid
          once the user scrolls — driven by the
          "scrolled" prop, see App.jsx)
      ======================================== */}
      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <nav className="navbar" aria-label="Main navigation">
          {/* ---- Logo (goes back to the store home) ---- */}
          <Link to="/" className="logo" aria-label="StyleStore home">
            Style<span>Store</span>
          </Link>

          {/* ---- Desktop links ---- */}
          <div className="nav-links">
            {NAV_ITEMS.map((label) => (
              <button
                key={label}
                type="button"
                className={activeLink === label ? "nav-link active" : "nav-link"}
                aria-current={activeLink === label ? "location" : undefined}
                onClick={() => go(label)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ---- Search + action icons ---- */}
          <div className="navbar-actions">
            {/* ========================================
                SEARCH
                One <form>: Enter inside the field and a click
                on the magnifier both submit the same search.
            ======================================== */}
            <form
              className="search-box"
              role="search"
              onSubmit={submitSearch}
              aria-label="Search products"
            >
              <button
                type="submit"
                className="search-submit"
                aria-label="Search products"
                title="Search"
              >
                <Search size={16} strokeWidth={2} aria-hidden="true" />
              </button>

              <input
                type="search"
                placeholder="Search products..."
                aria-label="Search products by name, SKU, category or colour"
                name="search"
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />

              {draft && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Account */}
            <button className="icon-button" aria-label="My account">
              <User size={20} strokeWidth={1.8} />
            </button>

            {/* My Orders */}
            <button
              className="icon-button"
              aria-label="My orders"
              onClick={() => navigate("/orders")}
            >
              <ReceiptText size={20} strokeWidth={1.8} />
            </button>

            {/* Wishlist with count */}
            <button
              className="icon-button wishlist-icon"
              aria-label={`Open wishlist, ${wishlistCount} items`}
              onClick={onOpenWishlist}
            >
              <Heart size={20} strokeWidth={1.8} />

              {wishlistCount > 0 && (
                <span className="badge">{wishlistCount}</span>
              )}
            </button>

            {/* Cart with count */}
            <button
              className="icon-button cart-icon"
              aria-label={`Open cart, ${cartCount} items`}
              onClick={onOpenCart}
            >
              <ShoppingBag size={20} strokeWidth={1.8} />

              {cartCount > 0 && (
                <span className="badge">{cartCount}</span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="icon-button menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </header>

      {/* ---- Mobile navigation drawer + overlay ---- */}
      <div
        className={menuOpen ? "mobile-menu-backdrop show" : "mobile-menu-backdrop"}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={menuOpen ? "mobile-menu open" : "mobile-menu"}
        aria-label="Mobile menu"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-head">
          <span className="mobile-menu-title">Menu</span>

          <button
            className="icon-button mobile-menu-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="mobile-menu-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              aria-current={activeLink === label ? "location" : undefined}
              className={activeLink === label ? "mobile-menu-link active" : "mobile-menu-link"}
              onClick={() => go(label)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Navbar;
