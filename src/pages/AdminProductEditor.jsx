/* ========================================================
   ADMIN PRODUCT EDITOR
   --------------------------------------------------------
   One beginner-friendly form, split into seven clearly
   titled sections:

     1 Basic information   5 Stock
     2 Pricing              6 Product labels
     3 Product images       7 Publishing
     4 Sizes & colours

   Prices stay numeric in the database and API — the
   "Rs." prefix is added by the shared formatter only when
   a price is rendered.
   ======================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Check,
  Eye,
  ImagePlus,
  Info,
  Loader2,
  Package,
  Plus,
  Ruler,
  Send,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import { formatLKR } from "../format";
import { assetUrl } from "../lib/productApi";
import "../admin.css";
import {
  createAdminProduct,
  getAdminCatalogueMeta,
  getAdminProduct,
  logoutAdmin,
  updateAdminProduct,
  updateAdminProductStatus,
} from "../lib/adminApi";
import {
  ADULT_SIZES,
  calculateDiscountPercent,
  DEFAULT_LOW_STOCK,
  formatBytes,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_BYTES,
  productTypeOptions,
  skuIsValid,
  STATUS_OPTIONS,
  stockState,
  STOCK_STATE_LABELS,
  suggestSku,
  suggestedSizes,
  validateImageFile,
} from "../lib/adminCatalog";
import {
  canonicalColourName,
  MAX_COLOURS,
  normaliseColourName,
  resolveColourHex,
} from "../lib/colours";

import AdminField from "../components/admin/AdminField";
import ColourSelector from "../components/admin/ColourSelector";
import FormSection from "../components/admin/FormSection";
import ImageManager from "../components/admin/ImageManager";
import ProductPreviewDialog from "../components/admin/ProductPreviewDialog";

const MAX_PRICE = 99_999_999;

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "Women",
  productType: "",
  useCustomType: false,
  customType: "",
  shortDescription: "",
  description: "",
  price: "",
  originalPrice: "",
  stockQuantity: "10",
  lowStockThreshold: String(DEFAULT_LOW_STOCK),
  sizes: [],
  colours: [],
  isNew: false,
  isFeatured: false,
  isSale: false,
  status: "draft",
  rating: "0",
  ratingCount: "0",
};

const OWN_CUSTOM_TYPE = "__custom__";

function resolveProductType(form) {
  return (form.useCustomType ? form.customType : form.productType).trim();
}

function productToForm(product) {
  return {
    ...EMPTY_FORM,
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "Women",
    productType: product.productType || "",
    useCustomType: false,
    customType: "",
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    price: product.price == null ? "" : String(product.price),
    originalPrice: product.originalPrice == null ? "" : String(product.originalPrice),
    stockQuantity: String(product.stockQuantity ?? 0),
    lowStockThreshold: String(product.lowStockThreshold ?? DEFAULT_LOW_STOCK),
    sizes: [...(product.sizes || [])],
    colours: (product.colours || []).map((colour) => ({
      name: colour.name || "",
      hex: colour.hex || "",
    })),
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
    isSale: Boolean(product.isSale),
    status: product.status || "draft",
    rating: String(product.rating ?? 0),
    ratingCount: String(product.ratingCount ?? 0),
  };
}

function validateForm(form) {
  const errors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Enter a product name of at least 2 characters.";
  }
  if (!resolveProductType(form)) {
    errors.productType = form.useCustomType
      ? "Type your own product type."
      : "Choose a product type.";
  }
  if (form.sku.trim() && !skuIsValid(form.sku)) {
    errors.sku = "Use 2–64 letters, numbers or hyphens, for example SS-WOM-DR01.";
  }
  if (form.shortDescription.length > 500) {
    errors.shortDescription = "Keep the short description under 500 characters.";
  }
  if (form.description.trim().length < 5) {
    errors.description = "Enter a full description of at least 5 characters.";
  }

  const price = Number(form.price);
  if (form.price.trim() === "" || !Number.isFinite(price) || price <= 0) {
    errors.price = "Enter a selling price greater than zero.";
  } else if (price > MAX_PRICE) {
    errors.price = "That price is too large. Use a number under 100,000,000.";
  }

  if (form.originalPrice.trim() !== "") {
    const original = Number(form.originalPrice);
    if (!Number.isFinite(original) || original <= 0) {
      errors.originalPrice = "Enter a valid original price, or leave it blank.";
    } else if (Number.isFinite(price) && price > 0 && original < price) {
      errors.originalPrice = "The original price cannot be lower than the selling price.";
    }
  }

  if (
    form.stockQuantity.trim() === "" ||
    !Number.isInteger(Number(form.stockQuantity)) ||
    Number(form.stockQuantity) < 0
  ) {
    errors.stockQuantity = "Enter stock as a whole number of 0 or more.";
  }
  if (
    form.lowStockThreshold.trim() === "" ||
    !Number.isInteger(Number(form.lowStockThreshold)) ||
    Number(form.lowStockThreshold) < 0
  ) {
    errors.lowStockThreshold = "Enter the warning level as a whole number of 0 or more.";
  }

  if (!form.sizes.length) errors.sizes = "Select or add at least one size.";
  if (!form.colours.length) errors.colours = "Add at least one colour.";

  return errors;
}

function buildFormData({
  form,
  newImages,
  removedImageIds,
  primary,
  status,
}) {
  const data = new FormData();
  data.set("name", form.name.trim());
  data.set("sku", form.sku.trim());
  data.set("category", form.category);
  data.set("productType", resolveProductType(form));
  data.set("shortDescription", form.shortDescription.trim());
  data.set("description", form.description.trim());
  data.set("price", form.price);
  data.set("originalPrice", form.originalPrice);
  data.set("stockQuantity", form.stockQuantity);
  data.set("lowStockThreshold", form.lowStockThreshold);
  data.set("sizes", JSON.stringify(form.sizes));
  data.set("colours", JSON.stringify(form.colours));
  data.set("isNew", String(form.isNew));
  data.set("isFeatured", String(form.isFeatured));
  data.set("isSale", String(form.isSale));
  data.set("status", status);
  data.set("rating", form.rating);
  data.set("ratingCount", form.ratingCount);
  if (removedImageIds.length) {
    data.set("removeImageIds", JSON.stringify(removedImageIds));
  }
  if (primary?.kind === "existing") data.set("primaryImageId", String(primary.id));
  if (primary?.kind === "new") {
    // The API addresses a new photo by its position in the uploaded batch, so
    // the position is resolved from the key rather than stored in state. That
    // way removing an earlier photo can never shift the "main" choice.
    const position = newImages.findIndex((image) => image.key === primary.key);
    if (position !== -1) data.set("primaryNewIndex", String(position));
  }
  newImages.forEach((image) => data.append("images", image.file));
  return data;
}

function firstErrorOf(errors) {
  return Object.keys(errors)[0] || null;
}

export default function AdminProductEditor() {
  const navigate = useNavigate();
  // The route is /admin/products/:productId/edit, so the id has to come from
  // the router rather than from a prop (there is no wrapper element to pass it).
  const { productId } = useParams();
  const editing = Boolean(productId);

  const formRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");
  const [product, setProduct] = useState(null);
  const [facets, setFacets] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newImages, setNewImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [primary, setPrimary] = useState(null);
  const [customSize, setCustomSize] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ---- Load the product being edited -------------------------------
  // New-product screens mount with EMPTY_FORM already in state, so this
  // effect only has to deal with the fetch.
  useEffect(() => {
    if (!editing) return undefined;
    let cancelled = false;
    getAdminProduct(productId)
      .then((result) => {
        if (cancelled) return;
        setProduct(result.product);
        setForm(productToForm(result.product));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || "This product could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, productId]);

  // ---- Release preview object URLs on unmount ------------------------
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  // ---- Product types already used, so older products stay editable ---
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

  // ---- Warn before leaving with unsaved changes ---------------------
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ---- Derived values ------------------------------------------------
  const typeOptions = useMemo(() => {
    const existingForCategory = (facets || [])
      .filter((facet) => facet.category === form.category)
      .flatMap((facet) => facet.productTypes.map((entry) => entry.productType));
    return productTypeOptions(form.category, existingForCategory);
  }, [facets, form.category]);

  const sizeOptions = useMemo(() => suggestedSizes(form.category), [form.category]);

  const discountPercent = useMemo(
    () => calculateDiscountPercent(form.price, form.originalPrice),
    [form.price, form.originalPrice]
  );

  const state = useMemo(
    () => stockState(form.stockQuantity, form.lowStockThreshold),
    [form.stockQuantity, form.lowStockThreshold]
  );

  const existingImages = useMemo(
    () =>
      (product?.images || []).map((image) => ({
        ...image,
        url: assetUrl(image.path),
      })),
    [product]
  );

  const keptExisting = existingImages.filter(
    (image) => !removedImageIds.includes(image.id)
  );

  const previewProduct = useMemo(() => {
    const mainNew =
      primary?.kind === "new"
        ? newImages.find((image) => image.key === primary.key)
        : null;
    const mainExisting =
      primary?.kind === "existing"
        ? keptExisting.find((image) => image.id === primary.id)
        : keptExisting.find((image) => image.isPrimary) || keptExisting[0];
    const price = Number(form.price) || 0;
    const originalPrice = form.originalPrice.trim() === "" ? null : Number(form.originalPrice);
    return {
      name: form.name.trim() || "Untitled product",
      sku: form.sku.trim() || suggestSku(form.category, form.name),
      category: form.category,
      productType: resolveProductType(form),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      price,
      originalPrice,
      discountPercent,
      stockQuantity: Number(form.stockQuantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      sizes: form.sizes,
      colours: form.colours,
      isNew: form.isNew,
      isFeatured: form.isFeatured,
      isSale: form.isSale || discountPercent > 0,
      status: form.status,
      image: mainNew?.url || mainExisting?.url || "",
    };
  }, [
    discountPercent,
    form,
    keptExisting,
    newImages,
    primary,
  ]);

  // ---- Helpers -------------------------------------------------------
  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const flash = (type, message) => {
    setNotice({ type, message });
  };

  const releaseUrl = (url) => {
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  };

  const scrollToFirstError = (errors) => {
    window.requestAnimationFrame(() => {
      const firstKey = firstErrorOf(errors);
      const target =
        formRef.current?.querySelector(`[data-error-key="${firstKey}"]`) || null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = target.querySelector(
        "input, select, textarea, button"
      );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
      }
    });
  };

  const confirmLeave = () => {
    if (!dirty) return true;
    return window.confirm(
      "You have unsaved changes on this product. Leave without saving?"
    );
  };

  const goBack = () => {
    if (confirmLeave()) navigate("/admin/products");
  };

  const handleSignOut = async () => {
    if (!confirmLeave()) return;
    await logoutAdmin().catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  // ---- Images --------------------------------------------------------
  const addFiles = (picked) => {
    const problems = picked.map(validateImageFile).filter(Boolean);
    if (problems.length) {
      flash("error", problems.join(" "));
      return;
    }
    const room = MAX_IMAGE_COUNT - (keptExisting.length + newImages.length);
    if (room <= 0) {
      flash("error", `A product can have at most ${MAX_IMAGE_COUNT} photos.`);
      return;
    }
    const accepted = picked.slice(0, room);
    if (picked.length > room) {
      flash(
        "info",
        `Only ${room} more photo${room === 1 ? "" : "s"} could be added (maximum ${MAX_IMAGE_COUNT}).`
      );
    }
    setNewImages((current) => [
      ...current,
      ...accepted.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        return { key: `${file.name}-${file.size}-${url}`, file, url };
      }),
    ]);
    setDirty(true);
  };

  const removeNewImage = (key) => {
    const target = newImages.find((image) => image.key === key);
    if (target) releaseUrl(target.url);
    setNewImages((current) => current.filter((image) => image.key !== key));
    setPrimary((current) => (current?.kind === "new" && current.key === key ? null : current));
    setDirty(true);
  };

  const removeExistingImage = (id) => {
    setRemovedImageIds((current) =>
      current.includes(id) ? current : [...current, id]
    );
    setPrimary((current) =>
      current?.kind === "existing" && current.id === id ? null : current
    );
    setDirty(true);
  };

  const restoreExistingImage = (id) => {
    setRemovedImageIds((current) => current.filter((item) => item !== id));
    setDirty(true);
  };

  const clearImageChanges = () => {
    setNewImages((current) => {
      for (const image of current) releaseUrl(image.url);
      return [];
    });
    setRemovedImageIds([]);
    setPrimary(null);
    setDirty(true);
  };

  // ---- Sizes ---------------------------------------------------------
  const toggleSize = (size) => {
    const exists = form.sizes.includes(size);
    update({
      sizes: exists
        ? form.sizes.filter((item) => item !== size)
        : [...form.sizes, size],
    });
  };

  const addCustomSize = () => {
    const value = customSize.trim().toUpperCase().slice(0, 30);
    if (!value) return;
    if (form.sizes.includes(value)) {
      flash("info", `Size "${value}" is already selected.`);
      setCustomSize("");
      return;
    }
    update({ sizes: [...form.sizes, value] });
    setCustomSize("");
  };

  // ---- Colours -------------------------------------------------------
  // The owner only ever works with colour NAMES. `lib/colours` turns a name
  // into the internal hex value the API expects, and we keep storing
  // `{ name, hex }` exactly as before so existing products are untouched.
  const addColourByName = (rawName) => {
    const cleanName = normaliseColourName(rawName);
    if (!cleanName) return false;
    if (
      form.colours.some(
        (colour) => colour.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      flash("info", `Colour "${cleanName}" is already selected.`);
      return false;
    }
    // The API keeps at most MAX_COLOURS per product, so stop here rather than
    // let the save quietly drop the extras.
    if (form.colours.length >= MAX_COLOURS) {
      flash(
        "error",
        `You can save up to ${MAX_COLOURS} colours on one product. Remove one first, then add "${cleanName}".`
      );
      return false;
    }
    update({
      colours: [...form.colours, { name: cleanName, hex: resolveColourHex(cleanName) }],
    });
    return true;
  };

  const toggleColour = (name) => {
    const target = String(name || "").trim().toLowerCase();
    const exists = form.colours.some(
      (colour) => colour.name.toLowerCase() === target
    );
    if (exists) {
      update({
        colours: form.colours.filter(
          (colour) => colour.name.toLowerCase() !== target
        ),
      });
      return;
    }
    addColourByName(name);
  };

  // A colour typed into the "Custom colour name" box. Common names such as
  // "Red" or "Off White" are matched to a palette entry so the stored hex
  // always makes sense; anything else is stored by name alone.
  const addCustomColour = (name) => {
    const cleanName = normaliseColourName(name);
    const mapped = canonicalColourName(cleanName);
    if (addColourByName(cleanName) && !mapped) {
      flash(
        "info",
        `"${cleanName}" was added. It will show on the product exactly as you typed it.`
      );
    }
  };

  // ---- Save ----------------------------------------------------------
  const save = async (statusOverride) => {
    if (saving) return;
    const nextStatus = statusOverride || form.status;
    const errors = validateForm(form);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) {
      setNotice(null);
      scrollToFirstError(errors);
      flash("error", "Please fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
    const data = buildFormData({
      form: { ...form, status: nextStatus },
      newImages,
      removedImageIds,
      primary,
      status: nextStatus,
    });

      const result = editing
        ? await updateAdminProduct(productId, data)
        : await createAdminProduct(data);

      for (const image of newImages) releaseUrl(image.url);
      setNewImages([]);
      setRemovedImageIds([]);
      setPrimary(null);
      setDirty(false);
      setForm((current) => ({ ...current, status: nextStatus }));
      setProduct(result.product);

      const label = STATUS_OPTIONS.find((option) => option.value === nextStatus)?.label;
      const message =
        nextStatus === "published"
          ? `“${result.product.name}” is published and live in the store.`
          : `“${result.product.name}” saved as ${label?.toLowerCase() || nextStatus}.`;

      if (editing) {
        flash("success", message);
        return;
      }
      navigate("/admin/products", { replace: true, state: { notice: { type: "success", message } } });
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setFormError(error.message || "The product could not be saved.");
      if (error.fields) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.fields).map(([key, value]) => [key, value.message])
          )
        );
        scrollToFirstError(error.fields);
      }
      flash("error", error.message || "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async () => {
    if (saving) return;
    const ok = window.confirm(
      `Archive "${product.name}"?\n\nIt will be hidden from the public website. Past orders keep their saved product details, photos and prices. You can restore it later.`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const result = await updateAdminProductStatus(productId, "archived");
      setForm((current) => ({ ...current, status: "archived" }));
      setProduct(result.product);
      setDirty(false);
      flash("success", `"${product.name}" is archived and hidden from the store.`);
    } catch (error) {
      flash("error", error.message || "The product could not be archived.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Render --------------------------------------------------------
  if (loading) {
    return (
      <main className="admin-page">
        <div className="adm-boot" role="status">
          <Loader2 className="spin" size={26} aria-hidden />
          <p>Loading this product…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="admin-page">
        <div className="adm-boot" role="alert">
          <p>{loadError}</p>
          <button type="button" className="adm-button" onClick={goBack}>
            <ArrowLeft size={15} aria-hidden /> Back to products
          </button>
        </div>
      </main>
    );
  }

  const submitLabel = editing
    ? "Update Product"
    : form.status === "published"
      ? "Publish Product"
      : "Create Product";

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <button type="button" className="adm-back" onClick={goBack}>
            <ArrowLeft size={15} aria-hidden /> All products
          </button>
          <span className="eyebrow">{editing ? "EDIT PRODUCT" : "NEW PRODUCT"}</span>
          <h1>{editing ? form.name || "Update product" : "Add a product"}</h1>
          <p>
            {editing
              ? "Change anything you need, then save. Existing orders keep their own saved copy."
              : "Fill in the seven sections below. Nothing is visible in your shop until you publish."}
          </p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="admin-logout" onClick={handleSignOut}>
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

      <form
        className="admin-form"
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {/* ============ 1. BASIC INFORMATION ============ */}
        <FormSection
          step="1"
          title="Basic Information"
          description="What the product is called, how you find it again, and where it belongs in the shop."
          icon={<Tag size={17} aria-hidden />}
        >
          <div className="adm-grid">
            <AdminField
              id="adm-name"
              label="Product name"
              required
              error={fieldErrors.name}
              errorKey="name"
              hint="Customers see this on the product card, e.g. Floral Summer Dress."
              className="adm-span-2"
            >
              <input
                id="adm-name"
                type="text"
                value={form.name}
                maxLength={255}
                onChange={(event) => update({ name: event.target.value })}
                aria-invalid={Boolean(fieldErrors.name)}
                placeholder="Floral Summer Dress"
              />
            </AdminField>

            <AdminField
              id="adm-sku"
              label="SKU / product code"
              error={fieldErrors.sku}
              errorKey="sku"
              hint={`Your internal code. Leave blank and we will create ${
                suggestSku(form.category, form.name) || "one for you"
              }.`}
            >
              <input
                id="adm-sku"
                type="text"
                value={form.sku}
                maxLength={64}
                onChange={(event) =>
                  update({ sku: event.target.value.toUpperCase() })
                }
                aria-invalid={Boolean(fieldErrors.sku)}
                placeholder="SS-WOM-DR01"
              />
            </AdminField>

            <AdminField
              id="adm-category"
              label="Main category"
              required
              hint="The top-level group used by the shop menu."
            >
              <select
                id="adm-category"
                value={form.category}
                onChange={(event) => {
                  const category = event.target.value;
                  update({
                    category,
                    productType: productTypeOptions(category, [
                      form.productType,
                    ]).includes(form.productType)
                      ? form.productType
                      : "",
                  });
                }}
              >
                {["Women", "Men", "Kids", "Accessories"].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField
              id="adm-product-type"
              label="Product type"
              required
              error={fieldErrors.productType}
              errorKey="productType"
              hint="The subcategory customers browse, e.g. Women › Dresses."
            >
              <select
                id="adm-product-type"
                value={form.useCustomType ? OWN_CUSTOM_TYPE : form.productType}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === OWN_CUSTOM_TYPE) update({ useCustomType: true });
                  else update({ useCustomType: false, productType: value });
                }}
                aria-invalid={Boolean(fieldErrors.productType)}
              >
                <option value="">Choose a type…</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value={OWN_CUSTOM_TYPE}>Other (type it myself)</option>
              </select>
            </AdminField>

            {form.useCustomType && (
              <AdminField
                id="adm-custom-type"
                label="Your own product type"
                required
                error={fieldErrors.productType}
                errorKey="productType"
                hint="Any wording you like, e.g. Anarkali Suits."
              >
                <input
                  id="adm-custom-type"
                  type="text"
                  value={form.customType}
                  maxLength={80}
                  onChange={(event) => update({ customType: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.productType)}
                  placeholder="Anarkali Suits"
                />
              </AdminField>
            )}

            <AdminField
              id="adm-short-description"
              label="Short description"
              error={fieldErrors.shortDescription}
              errorKey="shortDescription"
              hint={`One short line used on cards and search. ${form.shortDescription.length}/500 characters.`}
              className="adm-span-2"
            >
              <input
                id="adm-short-description"
                type="text"
                value={form.shortDescription}
                maxLength={500}
                onChange={(event) => update({ shortDescription: event.target.value })}
                aria-invalid={Boolean(fieldErrors.shortDescription)}
                placeholder="A breezy midi dress in a soft, colour-blocked knit."
              />
            </AdminField>

            <AdminField
              id="adm-description"
              label="Full description"
              required
              error={fieldErrors.description}
              errorKey="description"
              hint="Fabric, fit, care instructions — anything that helps a customer decide."
              className="adm-span-2"
            >
              <textarea
                id="adm-description"
                rows={5}
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
                aria-invalid={Boolean(fieldErrors.description)}
                placeholder="Lightweight viscose blend. Relaxed fit. Machine wash cold, dry in shade."
              />
            </AdminField>
          </div>
        </FormSection>

        {/* ============ 2. PRICING ============ */}
        <FormSection
          step="2"
          title="Pricing"
          description="Enter plain numbers only. The “Rs.” prefix and thousands separators are added automatically when prices are shown."
          icon={<Sparkles size={17} aria-hidden />}
        >
          <div className="adm-grid">
            <AdminField
              id="adm-price"
              label="Current selling price"
              required
              error={fieldErrors.price}
              errorKey="price"
              hint="The price customers actually pay, in rupees."
            >
              <input
                id="adm-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={form.price}
                onChange={(event) => update({ price: event.target.value })}
                aria-invalid={Boolean(fieldErrors.price)}
                placeholder="7800"
              />
            </AdminField>

            <AdminField
              id="adm-original-price"
              label="Original price"
              error={fieldErrors.originalPrice}
              errorKey="originalPrice"
              hint="The price before any discount. Leave blank if the product is not reduced."
            >
              <input
                id="adm-original-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={form.originalPrice}
                onChange={(event) => update({ originalPrice: event.target.value })}
                aria-invalid={Boolean(fieldErrors.originalPrice)}
                placeholder="9200"
              />
            </AdminField>
          </div>

          <div className="adm-price-preview">
            <div className="adm-price-now">
              <span className="adm-price-label">Customers pay</span>
              <strong>{formatLKR(Number(form.price) || 0)}</strong>
            </div>
            {discountPercent > 0 && (
              <>
                <div className="adm-price-was">
                  <span className="adm-price-label">Was</span>
                  <s>{formatLKR(Number(form.originalPrice) || 0)}</s>
                </div>
                <div className="adm-price-off">
                  <span className="adm-price-label">Discount</span>
                  <strong>{discountPercent}% off</strong>
                  <small>
                    You keep {formatLKR((Number(form.originalPrice) || 0) - (Number(form.price) || 0))}
                  </small>
                </div>
              </>
            )}
            {discountPercent === 0 && (
              <p className="adm-price-none">
                No discount yet. Add an original price higher than the selling price to show a
                sale badge.
              </p>
            )}
          </div>
        </FormSection>

        {/* ============ 3. PRODUCT IMAGES ============ */}
        <FormSection
          step="3"
          title="Product Images"
          description="Upload your own photos from this computer. The first image is the main photo used on product cards, quick view, the cart and checkout."
          icon={<ImagePlus size={17} aria-hidden />}
        >
          <ImageManager
            existingImages={existingImages}
            newImages={newImages}
            removedImageIds={removedImageIds}
            primary={primary}
            busy={saving}
            onAddFiles={addFiles}
            onRemoveNew={removeNewImage}
            onRemoveExisting={removeExistingImage}
            onRestoreExisting={restoreExistingImage}
            onSetPrimaryExisting={(id) => {
              setPrimary({ kind: "existing", id });
              setDirty(true);
            }}
            onSetPrimaryNew={(key) => {
              setPrimary({ kind: "new", key });
              setDirty(true);
            }}
            onClearAll={clearImageChanges}
          />
        </FormSection>

        {/* ============ 4. SIZES AND COLOURS ============ */}
        <FormSection
          step="4"
          title="Sizes and Colours"
          description="Tick the sizes you actually make, add anything unusual, and list the colourways. Customers pick from these in Quick View."
          icon={<Ruler size={17} aria-hidden />}
        >
          <AdminField
            id="adm-sizes"
            label="Sizes"
            required
            error={fieldErrors.sizes}
            errorKey="sizes"
            hint={`Tap a size to add or remove it. ${ADULT_SIZES.length} common sizes offered for ${form.category}.`}
          >
            <div className="adm-chips" role="group" aria-label="Common sizes">
              {sizeOptions.map((size) => {
                const active = form.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={active ? "adm-chip is-active" : "adm-chip"}
                    aria-pressed={active}
                    onClick={() => toggleSize(size)}
                    disabled={saving}
                  >
                    {active && <Check size={13} aria-hidden />}
                    {size}
                  </button>
                );
              })}
            </div>
          </AdminField>

          <div className="adm-inline-add">
            <label className="adm-inline-label" htmlFor="adm-custom-size">
              Add a custom size
            </label>
            <input
              id="adm-custom-size"
              type="text"
              value={customSize}
              maxLength={30}
              placeholder="28, 30, 32 or Free Size"
              onChange={(event) => setCustomSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomSize();
                }
              }}
            />
            <button
              type="button"
              className="adm-button adm-button-ghost"
              onClick={addCustomSize}
              disabled={saving || !customSize.trim()}
            >
              <Plus size={15} aria-hidden /> Add size
            </button>
          </div>

          {form.sizes.length > 0 && (
            <ul className="adm-selected">
              {form.sizes.map((size) => (
                <li key={size}>
                  <span>{size}</span>
                  <button
                    type="button"
                    onClick={() => toggleSize(size)}
                    disabled={saving}
                    aria-label={`Remove size ${size}`}
                  >
                    <X size={13} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ColourSelector
            id="adm-colours"
            label="Colours"
            required
            error={fieldErrors.colours}
            errorKey="colours"
            hint="Tap a colour to select it, tap it again to deselect it. Customers choose from these in Quick View."
            colours={form.colours}
            onToggle={toggleColour}
            onAddCustom={addCustomColour}
            disabled={saving}
          />
        </FormSection>

        {/* ============ 5. STOCK ============ */}
        <FormSection
          step="5"
          title="Stock"
          description="How many pieces you have right now. Customers cannot add an out-of-stock product to their bag."
          icon={<Warehouse size={17} aria-hidden />}
        >
          <div className="adm-grid">
            <AdminField
              id="adm-stock"
              label="Stock quantity"
              required
              error={fieldErrors.stockQuantity}
              errorKey="stockQuantity"
              hint="Use 0 when the product is sold out. Negative values are not allowed."
            >
              <input
                id="adm-stock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) => {
                  const raw = event.target.value;
                  update({
                    stockQuantity:
                      raw === ""
                        ? ""
                        : String(Math.max(0, Math.trunc(Number(raw) || 0))),
                  });
                }}
                aria-invalid={Boolean(fieldErrors.stockQuantity)}
              />
            </AdminField>

            <AdminField
              id="adm-low-stock"
              label="Low-stock warning level"
              error={fieldErrors.lowStockThreshold}
              errorKey="lowStockThreshold"
              hint={`Warn yourself in this list at ${form.lowStockThreshold || 0} pieces or fewer.`}
            >
              <input
                id="adm-low-stock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.lowStockThreshold}
                onChange={(event) => {
                  const raw = event.target.value;
                  update({
                    lowStockThreshold:
                      raw === ""
                        ? ""
                        : String(Math.max(0, Math.trunc(Number(raw) || 0))),
                  });
                }}
                aria-invalid={Boolean(fieldErrors.lowStockThreshold)}
              />
            </AdminField>
          </div>

          <div className={`adm-stock-preview adm-stock-preview-${state}`}>
            <Package size={18} aria-hidden />
            <div>
              <strong>{STOCK_STATE_LABELS[state]}</strong>
              <span>
                {Number(form.stockQuantity) || 0} piece
                {Number(form.stockQuantity) === 1 ? "" : "s"} available
                {state === "low_stock" &&
                  ` · warn me at ${form.lowStockThreshold} or fewer`}
                {state === "out_of_stock" &&
                  " · customers will see “Sold out” and cannot buy"}
              </span>
            </div>
          </div>
        </FormSection>

        {/* ============ 6. PRODUCT LABELS ============ */}
        <FormSection
          step="6"
          title="Product Labels"
          description="Badges help customers spot new pieces, favourites and reductions on the shop cards."
          icon={<Star size={17} aria-hidden />}
        >
          <div className="adm-switches">
            {[
              {
                key: "isNew",
                label: "New Arrival",
                hint: "Shows a NEW badge on the product card.",
              },
              {
                key: "isFeatured",
                label: "Featured",
                hint: "Featured pieces are sorted to the top by default.",
              },
              {
                key: "isSale",
                label: "On Sale",
                hint: "Adds a sale badge. Turned on automatically by a discount.",
              },
            ].map((item) => (
              <label className="adm-switch" key={item.key}>
                <input
                  type="checkbox"
                  checked={form[item.key]}
                  disabled={saving}
                  onChange={(event) => update({ [item.key]: event.target.checked })}
                />
                <span className="adm-switch-track" aria-hidden>
                  <span className="adm-switch-knob" />
                </span>
                <span className="adm-switch-text">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="adm-grid adm-rating-row">
            <AdminField
              id="adm-rating"
              label="Starting rating"
              hint="Optional. Leave at 0 if you do not want stars yet."
            >
              <input
                id="adm-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(event) => update({ rating: event.target.value })}
              />
            </AdminField>
            <AdminField
              id="adm-rating-count"
              label="Number of ratings"
              hint="Optional. How many customers rated this product."
            >
              <input
                id="adm-rating-count"
                type="number"
                min="0"
                step="1"
                value={form.ratingCount}
                onChange={(event) => update({ ratingCount: event.target.value })}
              />
            </AdminField>
          </div>
        </FormSection>

        {/* ============ 7. PUBLISHING ============ */}
        <FormSection
          step="7"
          title="Publishing"
          description="Decide whether this product is live in your shop, still being prepared, or safely archived."
          icon={<Send size={17} aria-hidden />}
        >
          <div className="adm-radios" role="radiogroup" aria-label="Publishing status">
            {STATUS_OPTIONS.map((option) => (
              <label
                className={form.status === option.value ? "adm-radio is-active" : "adm-radio"}
                key={option.value}
              >
                <input
                  type="radio"
                  name="product-status"
                  value={option.value}
                  checked={form.status === option.value}
                  disabled={saving}
                  onChange={() => update({ status: option.value })}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="adm-actions">
            <button
              type="button"
              className="adm-button adm-button-ghost"
              onClick={() => setPreviewOpen(true)}
              disabled={saving}
            >
              <Eye size={16} aria-hidden /> Preview Product
            </button>

            {form.status !== "draft" && (
              <button
                type="button"
                className="adm-button adm-button-ghost"
                onClick={() => save("draft")}
                disabled={saving}
              >
                Save as Draft
              </button>
            )}

            {form.status !== "published" && (
              <button
                type="button"
                className="adm-button adm-button-secondary"
                onClick={() => save("published")}
                disabled={saving}
              >
                <Send size={16} aria-hidden /> Publish Product
              </button>
            )}

            <button type="submit" className="adm-button adm-button-primary" disabled={saving}>
              {saving ? (
                <Loader2 className="spin" size={16} aria-hidden />
              ) : (
                <Check size={16} aria-hidden />
              )}
              {saving ? "Saving…" : submitLabel}
            </button>

            {editing && form.status !== "archived" && (
              <button
                type="button"
                className="adm-button adm-button-danger"
                onClick={archiveProduct}
                disabled={saving}
              >
                <Archive size={16} aria-hidden /> Archive
              </button>
            )}

            <button
              type="button"
              className="adm-button adm-button-quiet"
              onClick={goBack}
              disabled={saving}
            >
              <Trash2 size={15} aria-hidden /> Cancel
            </button>
          </div>

          {saving && (
            <p className="adm-saving" role="status">
              <Loader2 className="spin" size={15} aria-hidden />
              {newImages.length > 0
                ? `Uploading ${newImages.length} photo${newImages.length === 1 ? "" : "s"} and saving…`
                : "Saving your product…"}
            </p>
          )}

          {formError && (
            <p className="admin-form-error" role="alert">
              {formError}
            </p>
          )}

          <p className="adm-storage-note">
            Photos are stored in <code>server/uploads</code> with generated file names. Maximum{" "}
            {formatBytes(MAX_IMAGE_BYTES).replace(/\.0 /, " ")} per photo, {MAX_IMAGE_COUNT} photos
            per product. Only JPG, PNG and WebP files are accepted, and each file is checked before
            it is saved.
          </p>
        </FormSection>
      </form>

      {previewOpen && (
        <ProductPreviewDialog
          product={previewProduct}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </main>
  );
}
