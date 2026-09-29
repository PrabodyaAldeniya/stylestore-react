/* ============================================
   CART DRAWER — slide-in panel with free
   delivery progress, quantity controls and
   checkout CTA. Uses localStorage-backed cart.
============================================ */
import { Box, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { FREE_DELIVERY_THRESHOLD, formatLKR } from "../format";
import { colourSwatch } from "../lib/colours";
import { getPublicSizeDisplay } from "../lib/publicSizeDisplay";

const itemKey = (item) =>
  `${item.id}|${item.size || "none"}|${item.color || "none"}`;

/* ============================================
   SECTION: Public size display
   --------------------------------------------------------
   A bag line stores the internal size value, which for a Free Size
   product is the literal "Free Size". That value is what the order and
   the database keep, so it is never rewritten — it is only *displayed*
   through getPublicSizeDisplay(), the same helper the storefront uses.
   A Not Applicable line stores no size, so this renders nothing at all
   rather than an empty size or a dash.
   ============================================ */
function CartItemSize({ item }) {
  const display = getPublicSizeDisplay(item);
  if (!display.text) return null;
  return <span className="cart-item-size">{display.text}</span>;
}

function CartDrawer({
  isOpen,
  cartItems,
  cartTotal,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
}) {
  const progress = Math.min(
    ((cartTotal || 0) / FREE_DELIVERY_THRESHOLD) * 100,
    100
  );
  const remaining = Math.max(FREE_DELIVERY_THRESHOLD - (cartTotal || 0), 0);

  return (
    <aside
      className={isOpen ? "cart-drawer open" : "cart-drawer"}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
    >
      {/* ---- Header ---- */}
      <div className="cart-drawer-header">
        <h3>Your Bag</h3>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close cart">
          <X size={18} />
        </button>
      </div>

      {/* ---- Free delivery progress ---- */}
      <div className="free-delivery-progress">
        {remaining > 0 ? (
          <span>You're <strong>{formatLKR(remaining)}</strong> away from free delivery</span>
        ) : (
          <span>You've unlocked <strong>free delivery</strong> — enjoy!</span>
        )}
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* ---- Items ---- */}
      {cartItems.length === 0 ? (
        <div className="cart-empty">
          <ShoppingBag size={28} />
          <p>Your bag is empty.</p>
          <button type="button" className="primary-button" onClick={onClose}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <ul className="cart-items">
          {cartItems.map((item) => (
            <li key={itemKey(item)} className="cart-item">
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <span className="cart-item-image-placeholder" aria-label="Product photo pending">
                  <Box size={20} />
                </span>
              )}

              <div className="cart-item-info">
                <strong>{item.name}</strong>

                {/* ---- Size + colour ---- */}
                <div className="cart-item-meta">
                  <CartItemSize item={item} />
                  {item.color && (
                    <span className="cart-item-colour">
                      {/* The cart stores the colour NAME; the swatch falls back
                          to the palette when no hex travelled with it. */}
                      <span
                        className="cart-colour-dot"
                        style={{ background: colourSwatch({ name: item.color, hex: item.colorHex }) }}
                        aria-hidden="true"
                      />
                      Colour {item.color}
                    </span>
                  )}
                </div>

                <div className="cart-item-qty">
                  <button type="button" onClick={() => onDecrease(item)} aria-label="Decrease quantity">
                    <Minus size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onIncrease(item)} aria-label="Increase quantity">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="cart-item-right">
                <strong>{formatLKR(item.price)}</strong>
                <button type="button" onClick={() => onRemove(item)} aria-label="Remove item">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---- Footer / subtotal ---- */}
      {cartItems.length > 0 && (
        <div className="cart-drawer-footer">
          <div className="cart-subtotal">
            <span>Subtotal</span>
            <strong>{formatLKR(cartTotal)}</strong>
          </div>
          <p className="cart-shipping-note">Shipping and taxes calculated at checkout.</p>
          <button type="button" className="primary-button checkout-button" onClick={onCheckout}>
            Proceed to Checkout
          </button>
          <button type="button" className="cart-continue" onClick={onClose}>
            Continue shopping
          </button>
        </div>
      )}
    </aside>
  );
}

export default CartDrawer;