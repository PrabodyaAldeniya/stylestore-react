/* ========================================================
   WISHLIST DRAWER
   --------------------------------------------------------
   The slide-in panel listing everything the customer has saved
   with the heart button.

   It is a standalone component so the home page and the /products
   catalogue page show exactly the same drawer, and both read from
   the same `useWishlist` state.
   ======================================================== */
import { ShoppingBag, X } from "lucide-react";

import { formatLKR } from "../format";

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlistItems = [],
  onAddToCart,
  onRemoveFromWishlist,
}) {
  return (
    <>
      {isOpen && (
        <div className="drawer-backdrop" onClick={onClose} />
      )}
      <aside
        className={isOpen ? "wishlist-drawer open" : "wishlist-drawer"}
        aria-label="Wishlist"
      >
        <div className="cart-drawer-header">
          <h3>Wishlist ({wishlistItems.length})</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close wishlist">
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
                    onClick={() => onAddToCart(item)}
                    aria-label={`Add ${item.name} to bag`}
                  >
                    <ShoppingBag size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onRemoveFromWishlist(item.id)}
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
    </>
  );
}
