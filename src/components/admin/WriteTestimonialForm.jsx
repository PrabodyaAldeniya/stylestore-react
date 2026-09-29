/* ========================================================
   ADMIN — WRITE A TESTIMONIAL
   --------------------------------------------------------
   The store owner's own review, written from the admin area.

   An editorial testimonial is deliberately NOT a customer review:
   the server stores it with source = 'admin', never marks it as
   a verified purchase, and attaches it to no order — so it can
   never be mistaken for a real buyer, and it can never consume a
   customer's one-review-per-item allowance. It is also excluded
   from the product's star rating, so publishing it never changes
   the number a shopper reads as "what buyers say".

   The form starts as a DRAFT, so a half-written testimonial is
   never published by accident. The owner can publish it
   deliberately with one click afterwards.

   This component knows nothing about orders, customers or
   emails — there are no such fields here, on purpose.

   PRODUCT PICKER
   The catalogue is not loaded in one go: the product list endpoint caps
   a page at 100 rows, so a one-shot load would quietly hide everything
   past that. Instead the owner types and the server is asked for
   matching products only, which means every product stays reachable no
   matter how large the catalogue grows. A stale reply is discarded, so
   a slow answer for "dre" can never overwrite a fast one for "dress".
   ======================================================== */
import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Send, Sparkles, X } from "lucide-react";

import { createAdminReview, listAdminProducts } from "../../lib/adminApi";
import { StarInput } from "../reviews/StarRating";

const MAX_TITLE = 160;
const MAX_TEXT = 2000;
const MIN_TEXT = 10;

/** How many product suggestions the server returns per lookup. */
const PRODUCT_LOOKUP_SIZE = 25;

const EMPTY_FORM = {
  productId: "",
  customerName: "StyleStore Team",
  rating: 5,
  reviewTitle: "",
  reviewText: "",
};

export default function WriteTestimonialForm({ onCreated, onCancel, onAuthExpired }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ---- Product lookup state ----
  // Results are stamped with the query they were fetched for, so the
  // "still looking" flag can be derived during render instead of being set
  // inside the effect — setting it there would force a second render on
  // every keystroke. `key: null` means nothing has arrived yet, which is
  // why the very first load correctly shows as in progress.
  const [productQuery, setProductQuery] = useState("");
  const [lookup, setLookup] = useState({ key: null, items: [], error: "" });
  // A request number, so a slow reply for an older query is ignored.
  const lookupRef = useRef(0);

  useEffect(() => {
    const requestNumber = lookupRef.current + 1;
    lookupRef.current = requestNumber;

    listAdminProducts({ search: productQuery, pageSize: PRODUCT_LOOKUP_SIZE })
      .then((result) => {
        if (lookupRef.current !== requestNumber) return;
        setLookup({ key: productQuery, items: result.products || [], error: "" });
      })
      .catch((caught) => {
        if (lookupRef.current !== requestNumber) return;
        // An expired admin session is handled by the page, exactly as it is
        // for the review list and every moderation action.
        if (caught.code === "AUTH_REQUIRED") {
          onAuthExpired?.();
          return;
        }
        setLookup({
          key: productQuery,
          items: [],
          error: caught.message || "Products could not be loaded.",
        });
      });
  }, [productQuery, onAuthExpired]);

  const looked = lookup.key === productQuery;
  const suggestions = looked ? lookup.items : [];
  const lookupError = looked ? lookup.error : "";
  const looking = !looked;

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFields((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      // `status` is deliberately not sent: the server defaults to 'draft' and
      // the owner publishes it deliberately from the list afterwards.
      const result = await createAdminReview({
        productId: Number(form.productId),
        customerName: form.customerName,
        rating: form.rating,
        reviewTitle: form.reviewTitle,
        reviewText: form.reviewText,
      });
      onCreated?.(result);
    } catch (caught) {
      setFields(caught.fields || {});
      setError(caught.message || "The testimonial could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="adm-testimonial-form" onSubmit={save} noValidate>
      <div className="adm-testimonial-head">
        <span className="adm-testimonial-icon" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <div>
          <h2>Write a testimonial</h2>
          <p>
            Your own words about one of your products. Saved as a{" "}
            <strong>draft</strong> first, and never marked as a verified purchase. It will not
            change the product&rsquo;s star rating, which always reflects real customer reviews
            only.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            className="adm-icon-button"
            onClick={onCancel}
            aria-label="Close the testimonial form"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {error && (
        <p className="adm-notice adm-notice-error" role="alert">
          {error}
        </p>
      )}

      <div className="adm-field">
        <label htmlFor="adm-testimonial-product-search">Find a product</label>
        <div className="adm-testimonial-search">
          <Search size={15} aria-hidden />
          <input
            id="adm-testimonial-product-search"
            type="search"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="Type a product name or SKU"
            autoComplete="off"
          />
          {looking && <Loader2 size={15} className="spin" aria-hidden />}
        </div>
        {lookupError && (
          <span className="adm-field-error" role="alert">
            {lookupError}
          </span>
        )}

        <label htmlFor="adm-testimonial-product" className="adm-testimonial-picker-label">
          Product this testimonial is about
        </label>
        <select
          id="adm-testimonial-product"
          value={form.productId}
          onChange={(event) => update("productId", event.target.value)}
          aria-invalid={Boolean(fields.productId)}
          required
        >
          <option value="">
            {looking && suggestions.length === 0
              ? "Loading products…"
              : "Choose a product…"}
          </option>
          {suggestions.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
              {product.sku ? ` — ${product.sku}` : ""}
            </option>
          ))}
        </select>
        {fields.productId ? (
          <span className="adm-field-error">{fields.productId}</span>
        ) : (
          <small>
            Only products matching the box above are listed, so the whole catalogue is reachable.
          </small>
        )}
      </div>

      <div className="adm-field">
        <label htmlFor="adm-testimonial-rating">Rating</label>
        <StarInput
          id="adm-testimonial-rating"
          value={form.rating}
          onChange={(rating) => update("rating", rating)}
          error={Boolean(fields.rating)}
          disabled={busy}
        />
        {fields.rating && <span className="adm-field-error">{fields.rating}</span>}
      </div>

      <div className="adm-field">
        <label htmlFor="adm-testimonial-name">Shown as</label>
        <input
          id="adm-testimonial-name"
          type="text"
          maxLength={80}
          value={form.customerName}
          onChange={(event) => update("customerName", event.target.value)}
          aria-invalid={Boolean(fields.customerName)}
          required
        />
        {fields.customerName ? (
          <span className="adm-field-error">{fields.customerName}</span>
        ) : (
          <small>
            Visitors see this name plus a &ldquo;StyleStore Testimonial&rdquo; badge, not a verified
            buyer badge.
          </small>
        )}
      </div>

      <div className="adm-field">
        <label htmlFor="adm-testimonial-title">
          Title <span className="adm-optional">(optional)</span>
        </label>
        <input
          id="adm-testimonial-title"
          type="text"
          maxLength={MAX_TITLE}
          placeholder="Sum it up in a few words"
          value={form.reviewTitle}
          onChange={(event) => update("reviewTitle", event.target.value)}
        />
      </div>

      <div className="adm-field">
        <label htmlFor="adm-testimonial-text">Testimonial</label>
        <textarea
          id="adm-testimonial-text"
          rows={5}
          maxLength={MAX_TEXT}
          placeholder="What do you love about this piece? How does it fit, and how does it wear?"
          value={form.reviewText}
          onChange={(event) => update("reviewText", event.target.value)}
          aria-invalid={Boolean(fields.reviewText)}
          aria-describedby={fields.reviewText ? "adm-testimonial-text-error" : undefined}
          required
        />
        {fields.reviewText && (
          <span className="adm-field-error" id="adm-testimonial-text-error">
            {fields.reviewText}
          </span>
        )}
        <small>
          {form.reviewText.trim().length < MIN_TEXT ? `${MIN_TEXT} characters minimum` : " "}
          {form.reviewText.length} / {MAX_TEXT}
        </small>
      </div>

      <div className="adm-testimonial-actions">
        <button type="submit" className="adm-button adm-button-primary" disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" aria-hidden /> : <Send size={15} aria-hidden />}
          {busy ? "Saving…" : "Save as draft"}
        </button>
        {onCancel && (
          <button type="button" className="adm-button adm-button-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
