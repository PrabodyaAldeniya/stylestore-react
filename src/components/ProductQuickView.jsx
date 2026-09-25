/* ========================================
   PRODUCT QUICK VIEW — modal with sizes,
   colors, quantity, add-to-bag. Rendered by
   App; closes on overlay click or Escape.
======================================== */
import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatLKR } from "../format";

function ProductQuickView({ product, onClose, onAddToBag }) {
  const FALLBACK_SIZES = ["XS", "S", "M", "L", "XL"];

  const sizes =
    product.sizes && product.sizes.length > 0 ? product.sizes : FALLBACK_SIZES;

  const [size, setSize] = useState(sizes[1] || sizes[0]);
  const [qty, setQty] = useState(1);
  const [colorIndex, setColorIndex] = useState(0);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!product) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const colors = product.colors && product.colors.length ? product.colors : ["#141013"];

  const addToBag = () => {
    onAddToBag(product, { size, qty, color: colors[colorIndex] });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quickview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button quickview-close" onClick={onClose} aria-label="Close quick view">
          <X size={20} />
        </button>

        <div className="quickview-media">
          <img src={product.image} alt={product.alt || product.name} />
        </div>

        <div className="quickview-info">
          <span className="category">{product.category}</span>
          <h2>{product.name}</h2>

          <div className="quickview-price">
            <span className="price">{formatLKR(product.price)}</span>
            {product.oldPrice && <span className="old">{formatLKR(product.oldPrice)}</span>}
          </div>

          <p className="quickview-desc">{product.description}</p>

          {/* ---- Colors ---- */}
          <div className="qv-row">
            <span className="filter-label">Color</span>
            <div className="qv-colors">
              {colors.map((hex, index) => (
                <button
                  key={hex}
                  type="button"
                  className={index === colorIndex ? "qv-color sel" : "qv-color"}
                  style={{ background: hex }}
                  aria-label={`Color ${index + 1}`}
                  onClick={() => setColorIndex(index)}
                >
                  {index === colorIndex && (
                    <Check size={14} color="#fff" style={{ margin: "auto", display: "block", position: "relative", top: "2px" }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Sizes ---- */}
          <div className="qv-row">
            <span className="filter-label">Size</span>
            <div className="qv-sizes">
              {sizes.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={size === item ? "qv-size sel" : "qv-size"}
                  onClick={() => setSize(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Quantity + add ---- */}
          <div className="qv-row">
            <span className="filter-label">Qty</span>
            <div className="qv-qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus size={14} />
              </button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button type="button" className="primary-button qv-add" onClick={addToBag}>
            <ShoppingBag size={16} /> Add to Bag &mdash; {formatLKR(product.price * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductQuickView;