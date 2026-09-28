/* ========================================================
   ADMIN TRASH
   --------------------------------------------------------
   The soft-delete bin. Products listed here were removed
   from the shop with the Delete button, but their database
   row, uploaded photos, sizes and colours are all intact —
   so each one can still be viewed, restored, or deleted for
   good (with a typed confirmation).

   Archive and Trash stay separate: an archived product is a
   normal product that is merely inactive and is edited in
   the product list; a trashed product only lives here.
   ======================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Info, Loader2, RefreshCw, Trash2, X } from "lucide-react";

import {
  getAdminCatalogueMeta,
  listTrashedProducts,
  logoutAdmin,
  permanentlyDeleteProduct,
  restoreTrashedProduct,
} from "../lib/adminApi";
import { categoryOptions } from "../lib/adminCatalog";
import { assetUrl } from "../lib/productApi";
import AdminProductTable from "../components/admin/AdminProductTable";
import PermanentDeleteDialog from "../components/admin/PermanentDeleteDialog";
import ProductPreviewDialog from "../components/admin/ProductPreviewDialog";
import "../admin.css";

const EMPTY_FILTERS = { search: "", category: "all" };

const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "published", label: "Was Published" },
  { value: "draft", label: "Was Draft" },
  { value: "archived", label: "Was Archived" },
];

const EMPTY_MESSAGE =
  "The Trash is empty. Products you delete are kept here until you empty it for good.";

function toPreview(product) {
  return {
    ...product,
    // The API stores relative upload paths, so they have to be resolved to the
    // API origin before the shared preview card can load them.
    image: assetUrl(product.images?.[0]?.path || product.images?.[0]?.url || ""),
  };
}

export default function AdminTrash() {
  const navigate = useNavigate();

  const [facets, setFacets] = useState([]);
  const [products, setProducts] = useState([]);
  // Two different numbers, on purpose:
  //   trashCount     = how many products are in the Trash right now (the badge)
  //   filteredTotal  = how many of those match the current search/filters
  // The API returns both, so the badge never changes just because you filtered.
  const [trashCount, setTrashCount] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  // Product awaiting the "type DELETE" step, plus the error shown inside the
  // dialog when the server refuses.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadTrash = useCallback(async () => {
    setListStatus("loading");
    setListError("");
    try {
      const result = await listTrashedProducts({
        pageSize: 100,
        search: filters.search,
        category: filters.category === "all" ? "" : filters.category,
        status: statusFilter === "all" ? "" : statusFilter,
      });
      setProducts(result.products || []);
      setFilteredTotal(Number(result.total || 0));
      setTrashCount(Number(result.trashCount ?? result.total ?? 0));
      setListStatus("success");
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setListError(error.message || "The Trash could not be loaded.");
      setListStatus("error");
    }
  }, [filters, statusFilter, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(loadTrash, 180);
    return () => window.clearTimeout(timer);
  }, [loadTrash]);

  // The category list is the normal product facets plus any category that only
  // exists in the Trash, so a trashed product can always be found by filtering.
  useEffect(() => {
    let cancelled = false;
    getAdminCatalogueMeta()
      .then((result) => {
        if (cancelled) return;
        const merged = new Map();
        for (const entry of result.categories || []) merged.set(entry.category, entry.total);
        for (const entry of result.trashedCategories || []) {
          if (!merged.has(entry.category)) merged.set(entry.category, 0);
        }
        setFacets(
          [...merged.entries()].map(([category, total]) => ({ category, total }))
        );
      })
      .catch(() => {
        if (!cancelled) setFacets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => categoryOptions(facets), [facets]);
  const filtersActive = filters.search !== "" || filters.category !== "all" || statusFilter !== "all";

  const flash = (type, message) => setNotice({ type, message });

  const runAction = async (product, action, successMessage) => {
    setBusyId(product.id);
    setNotice(null);
    try {
      await action();
      await loadTrash();
      if (successMessage) flash("success", successMessage);
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      flash("error", error.message || "That action could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  const restoreFromTrash = (product) =>
    runAction(
      product,
      () => restoreTrashedProduct(product.id),
      product.status === "published"
        ? `Product restored successfully. "${product.name}" is live in the store again.`
        : `Product restored successfully. "${product.name}" is back in your product list as a ${product.status}.`
    );

  const openPermanentDelete = (product) => {
    setDeleteError("");
    setDeleteTarget(product);
  };

  const confirmPermanentDelete = async (confirmation) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await permanentlyDeleteProduct(deleteTarget.id, confirmation);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      await loadTrash();
      flash("success", `Product permanently deleted. "${name}" cannot be restored.`);
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setDeleteError(error.message || "That product could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const signOut = async () => {
    await logoutAdmin().catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <button type="button" className="adm-back" onClick={() => navigate("/admin/products")}>
            <ArrowLeft size={15} aria-hidden /> All products
          </button>
          <span className="eyebrow">STYLESTORE ADMIN</span>
          <h1>
            Trash{" "}
            <span className="adm-trash-count" aria-label={`${trashCount} in Trash`}>
              {trashCount}
            </span>
          </h1>
          <p>
            Products you deleted are kept here with their photos and details
            intact. Restore one to bring it back, or delete it for good — that
            cannot be undone. Your past orders are never affected.
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={() => navigate("/admin/products")}
          >
            Back to products
          </button>
          <button type="button" className="admin-logout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`adm-notice adm-notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.type === "success" ? (
            <Check size={16} aria-hidden />
          ) : (
            <Info size={16} aria-hidden />
          )}
          <span>{notice.message}</span>
          <button
            type="button"
            className="adm-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      )}

      <section className="admin-list-panel" aria-label="Trash">
        <div className="adm-filters adm-filters-trash">
          <div className="adm-filter adm-filter-search">
            <label className="adm-inline-label" htmlFor="adm-trash-search">
              Search
            </label>
            <input
              id="adm-trash-search"
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Product name or SKU"
            />
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-trash-category">
              Category
            </label>
            <select
              id="adm-trash-category"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({ ...current, category: event.target.value }))
              }
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-trash-status">
              Status before deleting
            </label>
            <select
              id="adm-trash-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={loadTrash}
            aria-label="Refresh the Trash"
          >
            <RefreshCw size={15} aria-hidden /> Refresh
          </button>
        </div>

        <div className="adm-list-meta">
          <p aria-live="polite">
            {filtersActive ? (
              <>
                <strong>{filteredTotal}</strong> of {trashCount} product
                {trashCount === 1 ? "" : "s"} in the Trash match your filters
              </>
            ) : (
              <>
                <strong>{trashCount}</strong> product{trashCount === 1 ? "" : "s"} in the Trash
              </>
            )}
          </p>
          {filtersActive && (
            <button
              type="button"
              className="adm-link-button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setStatusFilter("all");
              }}
            >
              Clear all filters
            </button>
          )}
        </div>

        {listStatus === "loading" && products.length > 0 && (
          <p className="adm-refreshing" role="status">
            <Loader2 className="spin" size={14} aria-hidden /> Refreshing the Trash…
          </p>
        )}

        <AdminProductTable
          variant="trash"
          products={products}
          status={listStatus}
          error={listError}
          busyId={busyId}
          emptyMessage={filtersActive ? "No trashed products match these filters." : EMPTY_MESSAGE}
          onRetry={loadTrash}
          onPreview={setPreviewProduct}
          onRestoreFromTrash={restoreFromTrash}
          onDeleteForever={openPermanentDelete}
        />

        <p className="adm-price-hint">
          <Trash2 size={13} aria-hidden /> Deleting forever removes the product, its photos,
          sizes and colours. Orders placed before that keep their own saved copy of the product,
          so order history stays complete either way.
        </p>
      </section>

      {previewProduct && (
        <ProductPreviewDialog
          product={toPreview(previewProduct)}
          onClose={() => setPreviewProduct(null)}
        />
      )}

      {deleteTarget && (
        <PermanentDeleteDialog
          product={deleteTarget}
          busy={deleting}
          error={deleteError}
          onClose={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError("");
          }}
          onConfirm={confirmPermanentDelete}
        />
      )}
    </main>
  );
}
