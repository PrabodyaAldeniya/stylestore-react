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
    quantity: Math.min(
      Math.max(Math.round(Number(raw.quantity) || MIN_QUANTITY), MIN_QUANTITY),
      MAX_QUANTITY
    ),
  };
}

const itemKey = (item) =>
  `${item.id}|${item.size || "none"}|${item.color || "none"}`;

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadCart);

  // Persist on every change; sanitise anything stale that comes out of storage.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems.map(sanitize)));
  }, [cartItems]);

  const addToCart = (product, options = {}) => {
    const size = options.size ?? null;
    const color = options.color ?? null;
    const qty = Math.min(
      Math.max(Math.round(Number(options.qty) || 1), MIN_QUANTITY),
      MAX_QUANTITY
    );

    setCartItems((current) => {
      const target = { id: product.id, size, color };
      const existing = current.find((item) => itemKey(item) === itemKey(target));

      if (existing) {
        return current.map((item) =>
          itemKey(item) === itemKey(target)
            ? { ...item, quantity: Math.min(item.quantity + qty, MAX_QUANTITY) }
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
          quantity: qty,
        },
      ];
    });
  };

  const setItemQuantity = (item, quantity) => {
    const qty = Math.min(
      Math.max(Math.round(Number(quantity) || MIN_QUANTITY), MIN_QUANTITY),
      MAX_QUANTITY
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
          ? { ...it, quantity: Math.min(it.quantity + 1, MAX_QUANTITY) }
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