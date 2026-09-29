/* ========================================================
   ADMIN PRODUCT LIST PAGE
   --------------------------------------------------------
   Search and filter every product, then edit, preview,
   publish/hide, archive or move to the Trash. Nothing here
   needs a code change — all actions hit the protected admin
   API.

   Delete is a SOFT delete: it moves the product to the Trash,
   where it can be viewed, restored or deleted for good. See
   AdminTrash.jsx for that screen.
   ======================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { formatLKR } from "../format";
import {
  getAdminCatalogueMeta,
  getAdminReviewCounts,
  listAdminProducts,
  logoutAdmin,
  moveProductToTrash,
  updateAdminProductStatus,
} from "../lib/adminApi";
import { categoryOptions } from "../lib/adminCatalog";
import { assetUrl } from "../lib/productApi";
import AdminProductTable from "../components/admin/AdminProductTable";
import ProductPreviewDialog from "../components/admin/ProductPreviewDialog";
import "../admin.css";

const EMPTY_FILTERS = {
  search: "",
  category: "all",
  productType: "all",
  status: "all",
  stock: "all",
  sort: "newest",
};

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const STOCK_FILTERS = [
  { value: "all", label: "Any stock level" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

const SORT_FILTERS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "featured", label: "Featured first" },
];

function toPreview(product) {
  return {
    ...product,
    // The API stores relative upload paths, so they have to be resolved to the
    // API origin before the shared preview card can load them.
    image: assetUrl(product.images?.[0]?.path || product.images?.[0]?.url || ""),
  };
}

export default function AdminProducts() {
  const navigate = useNavigate();
  // The editor navigates back here after a save and hands over a message.
  const location = useLocation();

  const [facets, setFacets] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  // How many products are waiting in the Trash; drives the header badge.
  const [trashCount, setTrashCount] = useState(0);
  // How many customer reviews still need attention (pending moderation);
  // drives the header badge. Verified reviews publish automatically, so this
  // is normally 0 and only rises for anything unusual.
  const [pendingReviews, setPendingReviews] = useState(0);
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [busyId, setBusyId] = useState(null);
  // Seeded once from the router state the editor hands over after a save.
  const [notice, setNotice] = useState(() => location.state?.notice || null);
  const [previewProduct, setPreviewProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    setListStatus("loading");
    setListError("");
    try {
      const result = await listAdminProducts({
        pageSize: 100,
        search: filters.search,
        category: filters.category === "all" ? "" : filters.category,
        productType: filters.productType === "all" ? "" : filters.productType,
        status: filters.status === "all" ? "" : filters.status,
        stock: filters.stock === "all" ? "" : filters.stock,
        sort: filters.sort,
      });
      setProducts(result.products || []);
      setTotal(Number(result.total || 0));
      setTrashCount(Number(result.trashCount || 0));
      setListStatus("success");
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setListError(error.message || "Products could not be loaded.");
      setListStatus("error");
    }
  }, [filters, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 180);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    if (!location.state?.notice) return;
    // Clear the router state so a browser refresh does not repeat the banner.
    // The message itself is already captured in `notice` above.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let cancelled = false;
    getAdminCatalogueMeta()
      .then((result) => {
        if (!cancelled) setFacets(result.categories || []);
      })
      .catch(() => {
        if (!cancelled) setFacets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refreshed whenever the product list reloads, so a moderation change on the
  // Reviews screen is reflected in this badge as soon as you come back.
  useEffect(() => {
    let cancelled = false;
    getAdminReviewCounts()
      .then((result) => {
        if (!cancelled) setPendingReviews(Number(result.pending || 0));
      })
      .catch(() => {
        if (!cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [listStatus]);

  const categories = useMemo(() => categoryOptions(facets), [facets]);

  const productTypes = useMemo(() => {
    if (filters.category === "all") {
      return [
        ...new Set(
          facets.flatMap((facet) =>
            facet.productTypes.map((entry) => entry.productType)
          )
        ),
      ].sort((a, b) => a.localeCompare(b));
    }
    const facet = facets.find((item) => item.category === filters.category);
    return (facet?.productTypes || []).map((entry) => entry.productType);
  }, [facets, filters.category]);

  const flash = (type, message) => setNotice({ type, message });

  const runAction = async (product, action, successMessage) => {
    setBusyId(product.id);
    setNotice(null);
    try {
      await action();
      await loadProducts();
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

  const toggleStatus = (product) => {
    const next = product.status === "published" ? "draft" : "published";
    const label = next === "published" ? "published" : "hidden as a draft";
    runAction(
      product,
      () => updateAdminProductStatus(product.id, next),
      `"${product.name}" is now ${label}.`
    );
  };

  // Archive keeps a product safely but inactive. It stays a normal row and
  // never enters the Trash, which is a separate, restorable bin.
  const archiveProduct = (product) => {
    const ok = window.confirm(
      `Archive "${product.name}"?\n\nIt disappears from the public website but stays safe here, and past orders keep their saved name, photo, price and size. You can restore it later.`
    );
    if (!ok) return;
    runAction(
      product,
      () => updateAdminProductStatus(product.id, "archived"),
      `"${product.name}" is archived.`
    );
  };

  const restoreProduct = (product) => {
    runAction(
      product,
      () => updateAdminProductStatus(product.id, "draft"),
      `"${product.name}" was restored as a draft. Publish it when you are ready.`
    );
  };

  // The Delete button is a soft delete: the product is hidden from the shop
  // straight away but nothing is destroyed, so it can be restored from Trash.
  const deleteProduct = (product) => {
    const ok = window.confirm(
      `Move "${product.name}" to the Trash?\n\nIt disappears from your website and your product list immediately, but the product, its photos and its details are all kept. You can restore it any time from the Trash.\n\nUse Archive instead if you want to keep it as an inactive product.`
    );
    if (!ok) return;
    runAction(
      product,
      () => moveProductToTrash(product.id),
      `Product moved to Trash. "${product.name}" can be restored from the Trash.`
    );
  };

  const signOut = async () => {
    await logoutAdmin().catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const filtersActive = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_FILTERS[key]
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">STYLESTORE ADMIN</span>
          <h1>Products</h1>
          <p>
            Add your dresses and clothing, upload real photos, and control what appears in the
            public shop.
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={() => navigate("/admin/reviews")}
            title="Read, hide, reject, restore or delete customer reviews"
          >
            <MessageSquare size={16} aria-hidden /> Reviews
            {pendingReviews > 0 && (
              <span className="adm-trash-count adm-review-badge">{pendingReviews}</span>
            )}
            <span className="adm-sr-only">
              {pendingReviews > 0
                ? `${pendingReviews} review${pendingReviews === 1 ? "" : "s"} need attention`
                : "No reviews need attention"}
            </span>
          </button>
          <button
            type="button"
            className="adm-button adm-button-trash"
            onClick={() => navigate("/admin/trash")}
            title="Open the Trash to view, restore or permanently delete products"
          >
            <Trash2 size={16} aria-hidden /> Trash
            <span className="adm-trash-count" aria-hidden>
              {trashCount}
            </span>
            <span className="adm-sr-only">
              {trashCount} product{trashCount === 1 ? "" : "s"} in Trash
            </span>
          </button>
          <button
            type="button"
            className="adm-button adm-button-primary"
            onClick={() => navigate("/admin/products/new")}
          >
            <Plus size={16} aria-hidden /> Add product
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

      <section className="admin-list-panel" aria-label="Product management">
        <div className="adm-filters">
          <div className="adm-filter adm-filter-search">
            <label className="adm-inline-label" htmlFor="adm-filter-search">
              Search
            </label>
            <input
              id="adm-filter-search"
              type="search"
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Product name or SKU"
            />
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-filter-category">
              Category
            </label>
            <select
              id="adm-filter-category"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                  productType: "all",
                }))
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
            <label className="adm-inline-label" htmlFor="adm-filter-type">
              Product type
            </label>
            <select
              id="adm-filter-type"
              value={filters.productType}
              onChange={(event) => setFilter("productType", event.target.value)}
            >
              <option value="all">All types</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-filter-status">
              Status
            </label>
            <select
              id="adm-filter-status"
              value={filters.status}
              onChange={(event) => setFilter("status", event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-filter-stock">
              Stock
            </label>
            <select
              id="adm-filter-stock"
              value={filters.stock}
              onChange={(event) => setFilter("stock", event.target.value)}
            >
              {STOCK_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="adm-filter">
            <label className="adm-inline-label" htmlFor="adm-filter-sort">
              Sort
            </label>
            <select
              id="adm-filter-sort"
              value={filters.sort}
              onChange={(event) => setFilter("sort", event.target.value)}
            >
              {SORT_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={loadProducts}
            aria-label="Refresh the product list"
          >
            <RefreshCw size={15} aria-hidden /> Refresh
          </button>
        </div>

        <div className="adm-list-meta">
          <p aria-live="polite">
            <strong>{products.length}</strong> of {total} product{total === 1 ? "" : "s"}
            {filtersActive ? " matching your filters" : ""}
          </p>
          {filtersActive && (
            <button
              type="button"
              className="adm-link-button"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear all filters
            </button>
          )}
        </div>

        {listStatus === "loading" && products.length > 0 && (
          <p className="adm-refreshing" role="status">
            <Loader2 className="spin" size={14} aria-hidden /> Refreshing list…
          </p>
        )}

        <AdminProductTable
          variant="active"
          products={products}
          status={listStatus}
          error={listError}
          busyId={busyId}
          onRetry={loadProducts}
          onEdit={(product) => navigate(`/admin/products/${product.id}/edit`)}
          onPreview={setPreviewProduct}
          onToggleStatus={toggleStatus}
          onArchive={archiveProduct}
          onRestore={restoreProduct}
          onMoveToTrash={deleteProduct}
        />

        <p className="adm-price-hint">
          Prices are stored as plain numbers in the database and shown as{" "}
          {formatLKR(7800)} in the shop. The Delete button only moves a product
          to the Trash — nothing is destroyed, and{" "}
          <button
            type="button"
            className="adm-link-button"
            onClick={() => navigate("/admin/trash")}
          >
            {trashCount} product{trashCount === 1 ? " is" : "s are"} waiting in the Trash
          </button>
          .
        </p>
      </section>

      {previewProduct && (
        <ProductPreviewDialog
          product={toPreview(previewProduct)}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </main>
  );
}
