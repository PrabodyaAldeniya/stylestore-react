import { Box, Loader2, RotateCcw } from "lucide-react";

import ProductCard from "./ProductCard";

function ProductList({
  products,
  status = "success",
  error = "",
  onRetry,
  wishlist,
  onAddToCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  onQuickView,
}) {
  if (status === "loading") {
    return (
      <div className="products-state" role="status">
        <Loader2 size={24} className="spin" />
        <p>Loading the collection…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="products-state products-state-error" role="alert">
        <Box size={30} />
        <h3>We couldn’t load the collection</h3>
        <p>{error || "Check that the StyleStore API is running and try again."}</p>
        {onRetry && (
          <button type="button" className="secondary-button" onClick={onRetry}>
            <RotateCcw size={15} /> Try again
          </button>
        )}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="products-empty">
        <span className="empty-icon"><Box size={30} /></span>
        <h3>Nothing matched your search</h3>
        <p>Try a different keyword, or clear your filters to see the full collection.</p>
      </div>
    );
  }

  return (
    <div className="product-grid" role="list" aria-label="Products">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          wishlist={wishlist}
          onAddToBag={onAddToCart}
          onAddToWishlist={onAddToWishlist}
          onRemoveFromWishlist={onRemoveFromWishlist}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}

export default ProductList;
