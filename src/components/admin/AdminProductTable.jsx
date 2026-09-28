/* ========================================================
   ADMIN PRODUCT LIST
   --------------------------------------------------------
   Responsive grid "table": columns line up on desktop and
   collapse into stacked cards on tablet / mobile, so the
   page never scrolls sideways.
   ======================================================== */
import {
  Archive,
  ArchiveRestore,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { formatLKR } from "../../format";
import { assetUrl } from "../../lib/productApi";
import { STOCK_STATE_LABELS, stockState } from "../../lib/adminCatalog";

const COLUMNS = [
  "Product",
  "SKU",
  "Category & type",
  "Price",
  "Stock",
  "Status",
  "Actions",
];

function StockTag({ product }) {
  const state = stockState(product.stockQuantity, product.lowStockThreshold);
  return (
    <span className={`adm-stock adm-stock-${state}`}>
      <strong>{product.stockQuantity}</strong> · {STOCK_STATE_LABELS[state]}
    </span>
  );
}

function AdminProductTable({
  products,
  status,
  error,
  busyId,
  onRetry,
  onEdit,
  onPreview,
  onToggleStatus,
  onArchive,
  onRestore,
  onDelete,
}) {
  if (status === "loading") {
    return (
      <div className="adm-state" role="status">
        <Loader2 className="spin" size={20} aria-hidden /> Loading products…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="adm-state adm-state-error" role="alert">
        <p>{error || "Products could not be loaded."}</p>
        <button type="button" className="adm-button adm-button-ghost" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden /> Try again
        </button>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="adm-state">
        <p>No products match these filters. Try clearing the search box.</p>
      </div>
    );
  }

  return (
    <div className="adm-table">
      <div className="adm-table-head" aria-hidden>
        <span />
        {COLUMNS.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>

      <ul className="adm-table-body">
        {products.map((product) => {
          const busy = String(busyId) === String(product.id);
          const mainImage = product.images?.find((image) => image.isPrimary) || product.images?.[0];
          return (
            <li className="adm-table-row" key={product.id}>
              <div className="adm-cell adm-cell-media">
                {mainImage ? (
                  <img src={assetUrl(mainImage.path)} alt="" loading="lazy" />
                ) : (
                  <span className="adm-cell-placeholder">
                    <ImagePlus size={18} aria-hidden />
                  </span>
                )}
                {busy && (
                  <span className="adm-cell-busy" aria-hidden>
                    <Loader2 className="spin" size={16} />
                  </span>
                )}
              </div>

              <div className="adm-cell adm-cell-name">
                <strong>{product.name}</strong>
                <small>{product.shortDescription || "No short description yet."}</small>
              </div>

              <div className="adm-cell" data-label="SKU">
                <code className="adm-sku">{product.sku}</code>
              </div>

              <div className="adm-cell" data-label="Category & type">
                {product.category}
                {product.productType ? <span> · {product.productType}</span> : null}
              </div>

              <div className="adm-cell adm-cell-price" data-label="Price">
                <span className="price">{formatLKR(product.price)}</span>
                {product.originalPrice > product.price && (
                  <small>
                    was {formatLKR(product.originalPrice)} · save {product.discountPercent}%
                  </small>
                )}
              </div>

              <div className="adm-cell" data-label="Stock">
                <StockTag product={product} />
              </div>

              <div className="adm-cell" data-label="Status">
                <span className={`adm-status adm-status-${product.status}`}>
                  {product.status}
                </span>
                {product.isNew && <span className="adm-tag adm-tag-new">New</span>}
                {product.isFeatured && <span className="adm-tag adm-tag-featured">Featured</span>}
                {product.isSale && <span className="adm-tag adm-tag-sale">Sale</span>}
              </div>

              <div className="adm-cell adm-cell-actions">
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  disabled={busy}
                  aria-label={`Edit ${product.name}`}
                  title="Edit"
                >
                  <Pencil size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onPreview(product)}
                  disabled={busy}
                  aria-label={`Preview ${product.name}`}
                  title="Preview"
                >
                  <Eye size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(product)}
                  disabled={busy}
                  aria-label={
                    product.status === "published"
                      ? `Hide ${product.name} from the store`
                      : `Publish ${product.name} in the store`
                  }
                  title={product.status === "published" ? "Hide from store" : "Publish"}
                >
                  {product.status === "published" ? "Hide" : "Publish"}
                </button>
                {product.status === "archived" ? (
                  <button
                    type="button"
                    onClick={() => onRestore(product)}
                    disabled={busy}
                    aria-label={`Restore ${product.name} from archive`}
                    title="Restore from archive"
                  >
                    <ArchiveRestore size={15} aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onArchive(product)}
                    disabled={busy}
                    aria-label={`Archive ${product.name}`}
                    title="Archive"
                  >
                    <Archive size={15} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete(product)}
                  disabled={busy}
                  aria-label={`Delete ${product.name} permanently`}
                  title="Delete permanently"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminProductTable;
