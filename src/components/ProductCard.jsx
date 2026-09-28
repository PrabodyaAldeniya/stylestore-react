import { useState } from "react";
import { Box, Eye, Heart, ShoppingBag } from "lucide-react";

import { formatLKR } from "../format";

function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="product-image-placeholder" aria-label={`${alt} photo pending`}>
        <Box size={30} />
        <span>Photo to be added</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width="600"
      height="750"
      className="product-image"
      onError={() => setFailed(true)}
    />
  );
}

function ProductCard({
  product,
  wishlist,
  onAddToBag,
  onAddToWishlist,
  onRemoveFromWishlist,
  onQuickView,
}) {
  const isWishlisted = wishlist?.some((id) => String(id) === String(product.id));
  const isNew = product.isNew === true || product.isNew === "New";
  const discount = Number(product.discountPercent) ||
    (product.oldPrice
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0);
  const colours = product.colorOptions?.length
    ? product.colorOptions
    : (product.colors || []).map((hex) => ({ hex, name: hex }));
  const hasVariantOptions = product.sizes?.length > 0 || colours.length > 0;
  const isOutOfStock = product.isOutOfStock || Number(product.stockQuantity) <= 0;

  return (
    <article className="product-card">
      <div className="product-media">
        <ProductImage src={product.image} alt={product.name} />

        <div className="product-badges">
          {isNew && <span className="badge badge-new">NEW</span>}
          {discount > 0 && <span className="badge badge-sale">-{discount}%</span>}
          {isOutOfStock && <span className="badge badge-out">SOLD OUT</span>}
        </div>

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

        <div className="product-quick-actions">
          <button
            type="button"
            className="quick-add-btn"
            disabled={isOutOfStock}
            onClick={() =>
              hasVariantOptions ? onQuickView(product) : onAddToBag(product)
            }
          >
            <ShoppingBag size={14} /> {isOutOfStock ? "Sold out" : hasVariantOptions ? "Choose" : "Add"}
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

      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>

        <div className="product-rating" aria-label={`${product.rating || 0} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={n <= Math.round(product.rating || 0) ? "star filled" : "star"}
              aria-hidden="true"
            >
              &#9733;
            </span>
          ))}
          <span className="rating-count">
            {product.ratingCount ? `(${product.ratingCount})` : ""}
          </span>
        </div>

        {colours.length > 0 && (
          <div
            className="product-colors"
            role="img"
            aria-label={`${colours.length} available colour${colours.length === 1 ? "" : "s"}`}
          >
            {colours.slice(0, 5).map((colour) => (
              <span
                key={colour.name || colour.hex}
                className="product-color-dot"
                style={{ backgroundColor: colour.hex || "transparent" }}
                title={colour.name}
                aria-hidden="true"
              />
            ))}
            <span className="product-colors-count">
              {colours.length} colour{colours.length === 1 ? "" : "s"}
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

export { ProductImage };
export default ProductCard;
