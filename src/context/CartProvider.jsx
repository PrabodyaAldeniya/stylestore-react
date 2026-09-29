/* ========================================
   CART PROVIDER — single source of truth for
   the shopping bag across all routes.
   Persists to localStorage so the cart survives
   a browser refresh. Quantity updates are
   clamped / sanitised so the cart can never
   hold bad values.
   ======================================== */
import { useEffect, useMemo, useState } from "react";
import { CartContext } from "./cartContext";
// ============================================
// SECTION: Product size modes
// --------------------------------------------------------
// The bag is the last place a size is chosen, so the size mode is
// applied here rather than trusted from the caller. A quick "Add"
// straight from a product card, the Quick View dialog and the order
// confirmation page all end up going through addToCart, so applying
// the rules in one place is what keeps them consistent:
//
//   free_size       always stored as "Free Size"
//   not_applicable  always stored as null
//   standard        the chosen size, or null if none was chosen
//
// cartSizeFor() reads the mode straight off the product the caller
// passed, so nothing new has to be threaded through the callers.
// ============================================
import { cartSizeFor } from "../lib/sizeModes";

const STORAGE_KEY = "styleStoreCart";
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitize(raw) {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    price: Number(raw.price) > 0 ? Number(raw.price) : 0,
    image: String(raw.image ?? ""),
    size: raw.size ? String(raw.size) : null,
    color: raw.color ? String(raw.color) : null,
    colorHex: raw.colorHex ? String(raw.colorHex) : null,
    stockQuantity: Math.max(Number(raw.stockQuantity) || 0, 0),
    quantity: Math.min(
      Math.max(Math.round(Number(raw.quantity) || MIN_QUANTITY), MIN_QUANTITY),
      MAX_QUANTITY
    ),
  };
}

const itemKey = (item) =>
  `${item.id}|${item.size || "none"}|${item.color || "none"}`;

const maxForItem = (item) =>
  Math.min(MAX_QUANTITY, Math.max(Number(item.stockQuantity) || MAX_QUANTITY, 1));

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadCart);

  // Persist on every change; sanitise anything stale that comes out of storage.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems.map(sanitize)));
  }, [cartItems]);

  const addToCart = (product, options = {}) => {
    if (product.isOutOfStock || Number(product.stockQuantity) <= 0) return;
    // The size mode decides the stored size, so a Free Size line always says
    // "Free Size" and a Not Applicable line always stores null — even when the
    // caller (a quick add from a product card, say) passed nothing at all.
    const size = cartSizeFor(product, options.size);
    const color = options.color ?? null;
    const colorHex = options.colorHex ?? null;
    const stock = Number(product.stockQuantity) || MAX_QUANTITY;
    const qty = Math.min(
      Math.max(Math.round(Number(options.qty) || 1), MIN_QUANTITY),
      Math.min(MAX_QUANTITY, stock)
    );

    setCartItems((current) => {
      const target = { id: product.id, size, color };
      const existing = current.find((item) => itemKey(item) === itemKey(target));

      if (existing) {
        return current.map((item) =>
          itemKey(item) === itemKey(target)
            ? { ...item, quantity: Math.min(item.quantity + qty, maxForItem(item)) }
            : item
        );
      }

      return [
        ...current,
        {
          id: Number(product.id),
          name: product.name,
          price: Number(product.price),
          image: product.image,
          size,
          color,
          colorHex,
          stockQuantity: Number(product.stockQuantity) || stock,
          quantity: qty,
        },
      ];
    });
  };

  const setItemQuantity = (item, quantity) => {
    const qty = Math.min(
      Math.max(Math.round(Number(quantity) || MIN_QUANTITY), MIN_QUANTITY),
      maxForItem(item)
    );
    setCartItems((current) =>
      current.map((it) =>
        itemKey(it) === itemKey(item) ? { ...it, quantity: qty } : it
      )
    );
  };

  const increaseQuantity = (item) =>
    setCartItems((current) =>
      current.map((it) =>
        itemKey(it) === itemKey(item)
          ? { ...it, quantity: Math.min(it.quantity + 1, maxForItem(it)) }
          : it
      )
    );

  const decreaseQuantity = (item) =>
    setCartItems((current) =>
      current
        .map((it) =>
          itemKey(it) === itemKey(item)
            ? { ...it, quantity: it.quantity - 1 }
            : it
        )
        .filter((it) => it.quantity >= MIN_QUANTITY)
    );

  const removeFromCart = (item) =>
    setCartItems((current) =>
      current.filter((it) => itemKey(it) !== itemKey(item))
    );

  const clearCart = () => setCartItems([]);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    setItemQuantity,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}