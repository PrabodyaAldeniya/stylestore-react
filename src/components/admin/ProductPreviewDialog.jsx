/* Product preview — shows the owner exactly what customers will see
   before the product is published. Uses the same price formatter and
   product card markup as the public store. */
import { useEffect } from "react";
import { Info, X } from "lucide-react";

import { formatLKR } from "../../format";
import { ProductImage } from "../ProductCard";
import { STOCK_STATE_LABELS, stockState } from "../../lib/adminCatalog";
import { colourLabel, colourSwatch } from "../../lib/colours";

function PreviewRow({ label, children }) {
  return (
    <div className="adm-preview-row">
      <span className="adm-preview-label">{label}</span>
      <span className="adm-preview-value">{children}</span>
    </div>
  );
}

function ProductPreviewDialog({ product, onClose }) {
  useEffect(() => {
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
  }, [onClose]);

  const state = stockState(product.stockQuantity, product.lowStockThreshold);
  const hasDiscount = Number(product.discountPercent) > 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="adm-preview" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="icon-button adm-preview-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={20} />
        </button>

        <div className="adm-preview-media">
          <ProductImage src={product.image} alt={product.name} />
        </div>

        <div className="adm-preview-info">
          <span className="eyebrow">CUSTOMER PREVIEW</span>
          <p className="adm-preview-cat">
            {product.category}
            {product.productType ? ` · ${product.productType}` : ""}
          </p>
          <h2>{product.name || "Untitled product"}</h2>

          <div className="adm-preview-price">
            <span className="price">{formatLKR(product.price || 0)}</span>
            {hasDiscount && (
              <>
                <span className="old-price">{formatLKR(product.originalPrice)}</span>
                <span className="badge badge-sale">-{product.discountPercent}%</span>
              </>
            )}
          </div>

          {product.shortDescription && (
            <p className="adm-preview-short">{product.shortDescription}</p>
          )}
          {product.description && (
            <p className="adm-preview-desc">{product.description}</p>
          )}

          <div className="adm-preview-facts">
            <PreviewRow label="SKU">{product.sku || "—"}</PreviewRow>
            <PreviewRow label="Sizes">
              {product.sizes?.length ? product.sizes.join(", ") : "—"}
            </PreviewRow>
            <PreviewRow label="Colours">
              {product.colours?.length ? (
                <span className="adm-preview-colours">
                  {product.colours.map((colour) => (
                    <span className="adm-preview-colour" key={colour.name}>
                      <span
                        className="adm-colour-circle"
                        style={{ backgroundColor: colourSwatch(colour) }}
                        aria-hidden="true"
                      />
                      {colourLabel(colour)}
                    </span>
                  ))}
                </span>
              ) : (
                "—"
              )}
            </PreviewRow>
            <PreviewRow label="Stock">
              {product.stockQuantity} in stock · {STOCK_STATE_LABELS[state]}
            </PreviewRow>
            <PreviewRow label="Badges">
              {[
                product.isNew ? "New Arrival" : null,
                product.isFeatured ? "Featured" : null,
                product.isSale || hasDiscount ? "On Sale" : null,
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            </PreviewRow>
            <PreviewRow label="Visibility">
              {product.status === "published"
                ? "Published — visible in the public store"
                : product.status === "archived"
                  ? "Archived — hidden, kept for past orders"
                  : "Draft — hidden from the public store"}
            </PreviewRow>
          </div>

          <p className="adm-preview-note">
            <Info size={15} aria-hidden />
            {product.image
              ? "This is the real uploaded photo customers will see."
              : "No photo uploaded yet, so the store shows the placeholder."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductPreviewDialog;
