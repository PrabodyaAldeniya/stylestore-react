/* ========================================
   PRODUCT CARD — editorial product tile.
   Hover: zoom + quick actions (add / view).
   Badges: NEW / SALE with % savings.
   Buttons: wishlist heart and basic add.
======================================== */
import { Eye, Heart, ShoppingBag } from "lucide-react";

import { formatLKR } from "../format";

function ProductCard({
  product,
  wishlist,
  onAddToBag,
  onAddToWishlist,
  onRemoveFromWishlist,
  onQuickView,
}) {
  const isWishlisted = wishlist && wishlist.includes(product.id);
  const isNew = product.isNew === true || product.isNew === "New";
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <article className="product-card">
      {/* ---- Media ---- */}
      <div className="product-media">
        <img
          src={product.image}
          alt={product.alt || product.name}
          loading="lazy"
          width="600"
          height="750"
          className="product-image"
        />

        {/* Top-left badges */}
        <div className="product-badges">
          {isNew && <span className="badge badge-new">NEW</span>}
          {discount > 0 && <span className="badge badge-sale">-{discount}%</span>}
        </div>

        {/* Wishlist (top-right) */}
        <button
          type="button"
          className={isWishlisted ? "wishlist-btn active" : "wishlist-btn"}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() =>
            isWishlisted
              ? onRemoveFromWishlist(product.id)
              : onAddToWishlist(product.id)
          }
        >
          <Heart
            size={17}
            fill={isWishlisted ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>

        {/* Quick actions on hover */}
        <div className="product-quick-actions">
          <button
            type="button"
            className="quick-add-btn"
            onClick={() => onAddToBag(product)}
          >
            <ShoppingBag size={14} /> Add
          </button>

          <button
            type="button"
            className="quick-view-btn"
            aria-label={"Quick view " + product.name}
            onClick={() => onQuickView(product)}
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* ---- Info ---- */}
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>

        <div className="product-rating" aria-label={product.rating + " out of 5 stars"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={n <= Math.round(product.rating) ? "star filled" : "star"}
              aria-hidden="true"
            >
              &#9733;
            </span>
          ))}
          <span className="rating-count">{product.ratingCount ? "(" + product.ratingCount + ")" : ""}</span>
        </div>

        {product.colors && product.colors.length > 0 && (
          <div
            className="product-colors"
            role="img"
            aria-label={`${product.colors.length} available colour${product.colors.length === 1 ? "" : "s"}`}
          >
            {product.colors.map((hex) => (
              <span
                key={hex}
                className="product-color-dot"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
            ))}
            <span className="product-colors-count">
              {product.colors.length} colour{product.colors.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div className="product-price">
          <span className="price">{formatLKR(product.price)}</span>
          {product.oldPrice && (
            <span className="old-price">{formatLKR(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
