import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatLKR } from "../format";
import { colourLabel, colourSwatch } from "../lib/colours";
// ============================================
// SECTION: Product size modes
// --------------------------------------------------------
// How the size area behaves comes from the product's size mode, not
// from whether a size list happens to be present:
//
//   standard        the customer chooses, and must choose, unless
//                   the product only sells one size
//   free_size       one value and no choice, so it is a plain label
//                   — never a size button
//   not_applicable  no size row at all, and `null` goes into the bag
//
// getPublicSizeDisplay() makes that one decision for every screen, so
// this dialog, the bag, checkout and order history can never disagree
// about what a product's size is called.
// ============================================
import {
  getPublicSizeDisplay,
  SIZE_DISPLAY_LABEL,
  SIZE_DISPLAY_SELECTOR,
} from "../lib/publicSizeDisplay";
import { cartSizeFor, FREE_SIZE_LABEL, SIZE_MODE_FREE_SIZE } from "../lib/sizeModes";
import { ProductImage } from "./ProductCard";
import ProductReviews from "./reviews/ProductReviews";

function ProductQuickView({ product, onClose, onAddToBag }) {
  // One decision for the whole size area: draw nothing, draw one plain label,
  // or draw the real size buttons. `options` is the clickable list, which is
  // empty unless the product really is a multi-size one.
  const sizeDisplay = getPublicSizeDisplay(product);
  const sizeMode = sizeDisplay.mode;
  const sizes = sizeDisplay.options;

  // A Standard Sizes product with more than one size is the only case where the
  // customer has to make a real choice before Add to Bag works. A one-size
  // product is filled in for them, because asking for a choice between one
  // option is just friction — and a Free Size product has no buttons at all.
  const mustChooseSize = sizeDisplay.required && sizes.length > 1;

  // Free Size needs no selection, so the button is never blocked.
  const canAdd = !mustChooseSize || Boolean(size);
  // `colorOptions` is the current [{ name, hex }] shape; `colors` is the
  // legacy hex-only list. `name` stays exactly as the API stored it, because
  // the API matches the chosen variant by that exact string when the order is
  // placed. `label` is the friendlier name used for display only.
  const colours = (product.colorOptions?.length
    ? product.colorOptions
    : (product.colors || []).map((hex) => ({ name: hex, hex }))
  ).map((colour) => ({
    name: String(colour.name || colour.hex || "").trim(),
    label: colourLabel(colour),
    hex: colourSwatch(colour),
  }));

  // A Standard Sizes product starts with nothing chosen, so the customer really
  // does pick. Free Size has no buttons to pick from — the label below is the
  // whole story — and Not Applicable has nothing to start on.
  const [size, setSize] = useState(
    sizeMode === SIZE_MODE_FREE_SIZE ? FREE_SIZE_LABEL : ""
  );
  const [qty, setQty] = useState(1);
  const [colorIndex, setColorIndex] = useState(0);
  const stock = Number(product.stockQuantity || 0);
  const isOutOfStock = product.isOutOfStock || stock <= 0;

  useEffect(() => {
    if (!product) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const selectedColour = colours[colorIndex] || null;
  const addToBag = () => {
    if (isOutOfStock || !canAdd) return;
    onAddToBag(product, {
      // cartSizeFor applies the mode rules one last time: Not Applicable
      // always stores null and Free Size always stores "Free Size", whatever
      // the buttons above look like.
      size: cartSizeFor(product, size),
      qty,
      color: selectedColour?.name || null,
      colorHex: selectedColour?.hex || null,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quickview-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-button quickview-close" onClick={onClose} aria-label="Close quick view">
          <X size={20} />
        </button>

        <div className="quickview-media">
          <ProductImage src={product.image} alt={product.name} />
        </div>

        <div className="quickview-info">
          <span className="category">{product.category}</span>
          <h2>{product.name}</h2>

          <div className="quickview-price">
            <span className="price">{formatLKR(product.price)}</span>
            {product.oldPrice && <span className="old">{formatLKR(product.oldPrice)}</span>}
          </div>

          <p className="quickview-desc">{product.description}</p>
          {isOutOfStock && <p className="stock-warning">This piece is currently sold out.</p>}

          {colours.length > 0 && (
            <div className="qv-row">
              <span className="filter-label">
                Colour{selectedColour ? `: ${selectedColour.label}` : ""}
              </span>
              <div className="qv-colors">
                {colours.map((colour, index) => (
                  <button
                    key={colour.name || colour.hex || index}
                    type="button"
                    className={index === colorIndex ? "qv-color sel" : "qv-color"}
                    style={{ background: colour.hex }}
                    title={colour.label}
                    aria-label={colour.label || `Colour ${index + 1}`}
                    aria-pressed={index === colorIndex}
                    onClick={() => setColorIndex(index)}
                  >
                    {index === colorIndex && (
                      <Check
                        size={14}
                        color="#fff"
                        style={{ margin: "auto", display: "block", position: "relative", top: "2px" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- The size area, driven by one display decision ----
              Free Size is a single plain label: there is no choice to
              make, so no button is drawn and "Free Size" is never said
              twice. Not Applicable shows nothing at all, because there is
              no size to choose. */}
          {sizeDisplay.kind === SIZE_DISPLAY_LABEL && (
            <div className="qv-row">
              <span className="filter-label">{sizeDisplay.caption}:</span>
              <span className="qv-size-fixed">{sizeDisplay.label}</span>
            </div>
          )}

          {sizeDisplay.kind === SIZE_DISPLAY_SELECTOR && sizes.length > 0 && (
            <>
              <div className="qv-row">
                <span className="filter-label">
                  Size
                  {mustChooseSize && size ? `: ${size}` : ""}
                </span>
                <div className="qv-sizes">
                  {sizes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={size === item ? "qv-size sel" : "qv-size"}
                      aria-pressed={size === item}
                      onClick={() => setSize(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              {mustChooseSize && !size && (
                <p className="qv-size-warning">Please choose a size to continue.</p>
              )}
            </>
          )}

          <div className="qv-row">
            <span className="filter-label">Qty</span>
            <div className="qv-qty">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
              >
                <Minus size={14} />
              </button>
              <span>{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={qty >= stock}
                onClick={() => setQty((value) => Math.min(stock, value + 1))}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="primary-button qv-add"
            disabled={isOutOfStock || !canAdd}
            onClick={addToBag}
          >
            <ShoppingBag size={16} />
            {isOutOfStock
              ? "Sold out"
              : `Add to Bag — ${formatLKR(product.price * qty)}`}
          </button>

          {/* ---- Approved reviews for THIS product, plus the average rating
                 and review count calculated from those approved reviews. ---- */}
          <ProductReviews
            productId={product.id}
            productName={product.name}
            limit={5}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductQuickView;
