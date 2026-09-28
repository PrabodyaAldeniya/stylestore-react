/* ========================================================
   ADMIN PRODUCT LIST
   --------------------------------------------------------
   Responsive grid "table": columns line up on desktop and
   collapse into stacked cards on tablet / mobile, so the
   page never scrolls sideways.

   One component serves both admin listings:
     variant "active" — the normal catalogue. The trash icon
       means "Move to Trash": the product is hidden from the
       shop, kept safely and restorable from the Trash page.
     variant "trash"  — products already in the Trash. Only
       View details, Restore and Delete forever are offered,
       because Archive and Publish do not apply here.
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

function formatTrashedAt(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  onMoveToTrash,
  onRestoreFromTrash,
  onDeleteForever,
  variant = "active",
  emptyMessage = "No products match these filters. Try clearing the search box.",
}) {
  const isTrash = variant === "trash";

  if (status === "loading") {
    return (
      <div className="adm-state" role="status">
        <Loader2 className="spin" size={20} aria-hidden />{" "}
        {isTrash ? "Loading the Trash…" : "Loading products…"}
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
        <p>{emptyMessage}</p>
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
            <li
              className={product.isTrashed ? "adm-table-row is-trashed" : "adm-table-row"}
              key={product.id}
            >
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
                {product.isTrashed ? (
                  <>
                    {/* The status is deliberately shown next to the Trash
                        badge: a restore has to bring back the same
                        Draft / Published / Archived state. */}
                    <span className="adm-status adm-status-trashed">In Trash</span>
                    <span className={`adm-status adm-status-${product.status}`}>
                      {product.status}
                    </span>
                    <small className="adm-trashed-at">
                      Trashed {formatTrashedAt(product.deletedAt)}
                    </small>
                  </>
                ) : (
                  <>
                    <span className={`adm-status adm-status-${product.status}`}>
                      {product.status}
                    </span>
                    {product.isNew && <span className="adm-tag adm-tag-new">New</span>}
                    {product.isFeatured && <span className="adm-tag adm-tag-featured">Featured</span>}
                    {product.isSale && <span className="adm-tag adm-tag-sale">Sale</span>}
                  </>
                )}
              </div>

              <div className="adm-cell adm-cell-actions">
                {isTrash ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onPreview(product)}
                      disabled={busy}
                      aria-label={`View details of ${product.name}`}
                      title="View details"
                    >
                      <Eye size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestoreFromTrash(product)}
                      disabled={busy}
                      aria-label={`Restore ${product.name} from the Trash`}
                      title="Restore from Trash"
                    >
                      <ArchiveRestore size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDeleteForever(product)}
                      disabled={busy}
                      aria-label={`Permanently delete ${product.name}`}
                      title="Delete forever — cannot be undone"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
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
                    {/* Archive keeps the product safe but inactive; it stays a
                        normal row and is NOT the same as the Trash. */}
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
                        title="Archive — keep the product but hide it from the store"
                      >
                        <Archive size={15} aria-hidden />
                      </button>
                    )}
                    {/* The trash icon is "Move to Trash", not a hard delete:
                        the product, its photos and its history are kept and it
                        can be restored from the Trash page. */}
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onMoveToTrash(product)}
                      disabled={busy}
                      aria-label={`Move ${product.name} to the Trash`}
                      title="Move to Trash — hides the product but keeps it restorable"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminProductTable;
