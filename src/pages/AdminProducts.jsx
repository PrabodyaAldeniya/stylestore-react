import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminSession,
  listAdminProducts,
  logoutAdmin,
  updateAdminProduct,
  updateAdminProductStatus,
} from "../lib/adminApi";
import { assetUrl } from "../lib/productApi";

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "Women",
  productType: "",
  shortDescription: "",
  description: "",
  price: "",
  originalPrice: "",
  stockQuantity: "0",
  rating: "0",
  ratingCount: "0",
  sizes: "",
  colours: "",
  status: "draft",
  isNew: false,
  isFeatured: false,
  isSale: false,
};

function productToForm(product) {
  return {
    sku: product.sku || "",
    name: product.name || "",
    category: product.category || "Women",
    productType: product.productType || "",
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    price: product.price ?? "",
    originalPrice: product.originalPrice ?? "",
    stockQuantity: product.stockQuantity ?? 0,
    rating: product.rating ?? 0,
    ratingCount: product.ratingCount ?? 0,
    sizes: (product.sizes || []).join(", "),
    colours: (product.colours || product.colorOptions || [])
      .map((colour) => (colour.hex ? `${colour.name}|${colour.hex}` : colour.name))
      .join(", "),
    status: product.status || "draft",
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
    isSale: Boolean(product.isSale),
  };
}

function parseColours(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, hex] = part.split("|").map((item) => item.trim());
      return { name, hex: hex || null };
    });
}

function toFormData(form, files) {
  const data = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (typeof value === "boolean") data.append(key, value ? "true" : "false");
    else data.append(key, value);
  });
  data.set("sizes", JSON.stringify(form.sizes.split(",").map((item) => item.trim()).filter(Boolean)));
  data.set("colours", JSON.stringify(parseColours(form.colours)));
  files.forEach((file) => data.append("images", file));
  return data;
}

function StatusBadge({ status }) {
  return <span className={`admin-status admin-status-${status}`}>{status}</span>;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [products, setProducts] = useState([]);
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [files, setFiles] = useState([]);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setListStatus("loading");
    setListError("");
    try {
      const result = await listAdminProducts({
        pageSize: 100,
        search,
        status: statusFilter === "all" ? "" : statusFilter,
        sort: "newest",
      });
      setProducts(result.products || []);
      setListStatus("success");
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setListError(error.message || "Products could not be loaded.");
      setListStatus("error");
    }
  }, [navigate, search, statusFilter]);

  useEffect(() => {
    getAdminSession()
      .then((result) => {
        if (!result.authenticated) {
          navigate("/admin/login", { replace: true });
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => navigate("/admin/login", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return undefined;
    const timer = window.setTimeout(loadProducts, 180);
    return () => window.clearTimeout(timer);
  }, [authChecked, loadProducts]);

  const editingProduct = useMemo(
    () => products.find((product) => String(product.id) === String(editingId)) || null,
    [editingId, products]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFiles([]);
    setFormError("");
    setFieldErrors({});
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm(productToForm(product));
    setFiles([]);
    setFormError("");
    setFieldErrors({});
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      const data = toFormData(form, files);
      if (editingId) await updateAdminProduct(editingId, data);
      else await createAdminProduct(data);
      resetForm();
      await loadProducts();
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setFormError(error.message || "The product could not be saved.");
      setFieldErrors(error.fields || {});
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product) => {
    const nextStatus = product.status === "published" ? "draft" : "published";
    try {
      await updateAdminProductStatus(product.id, nextStatus);
      await loadProducts();
    } catch (error) {
      setListError(error.message || "The product status could not be changed.");
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      await deleteAdminProduct(product.id);
      if (String(editingId) === String(product.id)) resetForm();
      await loadProducts();
    } catch (error) {
      setListError(error.message || "The product could not be deleted.");
    }
  };

  const signOut = async () => {
    await logoutAdmin().catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  if (!authChecked) {
    return <main className="admin-page"><Loader2 className="spin" size={24} /></main>;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">STYLESTORE ADMIN</span>
          <h1>Product catalogue</h1>
          <p>Create products, upload real photos, and control what appears in the store.</p>
        </div>
        <button type="button" className="admin-logout" onClick={signOut}>
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <div className="admin-layout">
        <section className="admin-list-panel">
          <div className="admin-toolbar">
            <input
              type="search"
              placeholder="Search by name or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search products"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <button type="button" className="admin-icon-button" onClick={loadProducts} aria-label="Refresh products">
              <RefreshCw size={16} />
            </button>
          </div>

          {listStatus === "loading" && <div className="admin-state"><Loader2 className="spin" size={20} /> Loading products…</div>}
          {listStatus === "error" && <div className="admin-state admin-state-error">{listError}</div>}
          {listStatus === "success" && products.length === 0 && (
            <div className="admin-state">No products match this view.</div>
          )}
          {listStatus === "success" && products.length > 0 && (
            <div className="admin-product-list">
              {products.map((product) => (
                <article className="admin-product-row" key={product.id}>
                  <div className="admin-product-thumb">
                    {product.images?.[0]?.path ? (
                      <img src={assetUrl(product.images[0].path)} alt="" />
                    ) : (
                      <ImagePlus size={20} />
                    )}
                  </div>
                  <div className="admin-product-summary">
                    <div className="admin-product-title-line">
                      <strong>{product.name}</strong>
                      <StatusBadge status={product.status} />
                    </div>
                    <span>{product.sku} · {product.category} · {product.stockQuantity} in stock</span>
                    {product.images?.length === 0 && <small>No real photo uploaded yet.</small>}
                  </div>
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => toggleStatus(product)} aria-label={`Change status for ${product.name}`}>
                      <Check size={15} />
                    </button>
                    <button type="button" className="danger" onClick={() => removeProduct(product)} aria-label={`Delete ${product.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-form-panel">
          <div className="admin-form-heading">
            <div>
              <span className="eyebrow">{editingId ? "EDIT PRODUCT" : "NEW PRODUCT"}</span>
              <h2>{editingId ? "Update product" : "Add a product"}</h2>
            </div>
            {editingId && (
              <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="Cancel edit">
                <X size={17} />
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={saveProduct}>
            <div className="admin-form-grid">
              <label>Product name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />{fieldErrors.name && <small>{fieldErrors.name.message}</small>}</label>
              <label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="Auto-generated if blank" />{fieldErrors.sku && <small>{fieldErrors.sku.message}</small>}</label>
              <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Women</option><option>Men</option><option>Kids</option><option>Accessories</option></select></label>
              <label>Product type<input value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })} placeholder="Dress, T-Shirt, Jacket…" required />{fieldErrors.productType && <small>{fieldErrors.productType.message}</small>}</label>
              <label>Price (LKR)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />{fieldErrors.price && <small>{fieldErrors.price.message}</small>}</label>
              <label>Original price (optional)<input type="number" min="0" step="0.01" value={form.originalPrice} onChange={(event) => setForm({ ...form, originalPrice: event.target.value })} />{fieldErrors.originalPrice && <small>{fieldErrors.originalPrice.message}</small>}</label>
              <label>Stock quantity<input type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} required />{fieldErrors.stockQuantity && <small>{fieldErrors.stockQuantity.message}</small>}</label>
              <label>Rating<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} />{fieldErrors.rating && <small>{fieldErrors.rating.message}</small>}</label>
              <label>Rating count<input type="number" min="0" step="1" value={form.ratingCount} onChange={(event) => setForm({ ...form, ratingCount: event.target.value })} /></label>
            </div>

            <label>Short description<input value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} maxLength={500} /></label>
            <label>Full description<textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />{fieldErrors.description && <small>{fieldErrors.description.message}</small>}</label>
            <div className="admin-form-grid">
              <label>Sizes<input value={form.sizes} onChange={(event) => setForm({ ...form, sizes: event.target.value })} placeholder="XS, S, M, L, XL" required />{fieldErrors.sizes && <small>{fieldErrors.sizes.message}</small>}</label>
              <label>Colours<input value={form.colours} onChange={(event) => setForm({ ...form, colours: event.target.value })} placeholder="Black|#1e1e1e, Sand|#d9c8b8" required />{fieldErrors.colours && <small>{fieldErrors.colours.message}</small>}</label>
            </div>
            <p className="admin-hint">Use a comma-separated list. Add an optional hex swatch after `|` for colour dots.</p>

            <div className="admin-checks">
              <label><input type="checkbox" checked={form.isNew} onChange={(event) => setForm({ ...form, isNew: event.target.checked })} /> Mark as new</label>
              <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Feature product</label>
              <label><input type="checkbox" checked={form.isSale} onChange={(event) => setForm({ ...form, isSale: event.target.checked })} /> Mark as sale</label>
            </div>

            <label className="admin-upload-label">Product photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles([...event.target.files])} />
              <span className="admin-upload-hint"><ImagePlus size={15} /> JPG, PNG, or WebP · up to 6 files · 5 MB each</span>
            </label>

            {editingProduct?.images?.length > 0 && (
              <div className="admin-existing-images">
                {editingProduct.images.map((image) => <img key={image.id} src={assetUrl(image.path)} alt="" />)}
              </div>
            )}

            <div className="admin-form-footer">
              <label className="admin-status-select">Visibility
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="draft">Draft — hidden from store</option>
                  <option value="published">Published — visible immediately</option>
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? "Saving…" : editingId ? "Save changes" : "Create product"}
              </button>
            </div>
            {formError && <p className="admin-form-error" role="alert">{formError}</p>}
            <p className="admin-storage-note">
              Production hosting may clear local uploads when the server restarts. Use Cloudinary,
              Supabase Storage, or another managed image store before launch.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
