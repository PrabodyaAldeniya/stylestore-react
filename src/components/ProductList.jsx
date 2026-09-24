/* ========================================
   PRODUCT LIST — editorial product grid.
   Receives the already-filtered/sorted array
   from App; renders ProductCard tiles or an
   empty state. Grid is 1/2/3/4 cols responsive.
======================================== */
import { Box } from "lucide-react";

import ProductCard from "./ProductCard";

function ProductList({
  products,
  wishlist,
  onAddToCart,
  onAddToWishlist,
  onRemoveFromWishlist,
  onQuickView,
}) {
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