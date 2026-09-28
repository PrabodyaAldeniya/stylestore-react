/* ========================================================
   WRITE A REVIEW FORM
   --------------------------------------------------------
   Two steps, no account and no signup.

   Step 1 — Find your order
     Order number + the email used at checkout. The server
     checks that pair against the orders table and answers with
     the products in that order only, so a customer can never
     even be offered a product they did not buy.

   Step 2 — Write your review
     Pick one of the products, choose 1–5 stars, add an optional
     title and a short message, and the name you would like
     shown. The server re-checks the order from scratch, marks
     the review "Verified Buyer" because the check passed, and
     saves it as PENDING for the owner to approve.

   Nothing here trusts the browser: the verification result, the
   product list and the Verified Buyer flag all come from the
   server, never from local state.
   ======================================================== */
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Loader2, Search, Send } from "lucide-react";

import { submitReview, verifyOrderForReview } from "../../lib/reviewApi";
import { assetUrl } from "../../lib/productApi";
import { StarInput } from "./StarRating";

const MAX_TITLE = 160;
const MAX_TEXT = 2000;
const MIN_TEXT = 10;

const EMPTY_FORM = {
  orderNumber: "",
  email: "",
  customerName: "",
  rating: 0,
  reviewTitle: "",
  reviewText: "",
  // Honeypot: a real person never sees or fills this field.
  website: "",
};

export default function WriteReviewForm({ initialOrderNumber = "", onDone, onCancel }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    orderNumber: initialOrderNumber,
  });
  const [order, setOrder] = useState(null);
  const [fields, setFields] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const headingRef = useRef(null);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFields((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  // Move focus to the top of the dialog when it opens so screen-reader and
  // keyboard users are not left at the bottom of the page.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const reviewable = (order?.products || []).filter((item) => !item.alreadyReviewed);
  const chosen = reviewable.find((item) => Number(item.productId) === Number(form.productId));

  // ---- Step 1: verify the order number + email ----
  const findOrder = async (event) => {
    event.preventDefault();
    setVerifying(true);
    setMessage(null);
    setFields({});
    try {
      const result = await verifyOrderForReview(form.orderNumber, form.email);
      setOrder(result);
      setForm((current) => ({ ...current, productId: result.products?.[0]?.productId ?? "" }));
      if (!result.reviewableCount) {
        setMessage({
          type: "info",
          text: "You have already reviewed every item in this order. Thank you!",
        });
      }
    } catch (error) {
      setOrder(null);
      setFields(error.fields || {});
      setMessage({ type: "error", text: error.message });
    } finally {
      setVerifying(false);
    }
  };

  const changeOrder = () => {
    setOrder(null);
    setForm((current) => ({ ...current, productId: "" }));
    setMessage(null);
    setFields({});
  };

  // ---- Step 2: submit the review ----
  const send = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setFields({});
    try {
      const result = await submitReview({
        orderNumber: form.orderNumber,
        email: form.email,
        productId: Number(form.productId),
        customerName: form.customerName,
        rating: form.rating,
        reviewTitle: form.reviewTitle,
        reviewText: form.reviewText,
        website: form.website,
      });
      // The exact wording the shop promises on submission.
      setMessage({ type: "success", text: result.message });
      if (onDone) onDone(result);
    } catch (error) {
      setFields(error.fields || {});
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen: the confirmation plus what happens next ----
  if (message?.type === "success") {
    return (
      <div className="rv-form-done" role="status">
        <span className="rv-done-icon" aria-hidden="true">
          <Check size={26} />
        </span>
        <h3 className="rv-form-heading" tabIndex={-1} ref={headingRef}>
          Thank you!
        </h3>
        <p className="rv-done-lead">{message.text}</p>
        {chosen && (
          <p className="rv-done-note">
            Your review of <strong>{chosen.productName}</strong> will appear on the website once
            the StyleStore team has approved it.
          </p>
        )}
        {onDone && (
          <button type="button" className="secondary-button rv-done-close" onClick={onDone}>
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rv-form">
      <h3 className="rv-form-heading" tabIndex={-1} ref={headingRef}>
        {order ? "Write your review" : "Find your order"}
      </h3>

      {message && (
        <p className={`rv-alert rv-alert-${message.type}`} role="alert">
          {message.text}
        </p>
      )}

      {!order ? (
        // ================= STEP 1 =================
        <form className="rv-form-body" onSubmit={findOrder} noValidate>
          <p className="rv-form-lead">
            No account needed. Enter your order number and the email address you used at
            checkout, then tell us what you thought.
          </p>

          <div className="rv-field">
            <label htmlFor="rv-order-number">Order number</label>
            <input
              id="rv-order-number"
              name="orderNumber"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck="false"
              placeholder="SS-20250101-AB12C"
              value={form.orderNumber}
              onChange={(event) => update("orderNumber", event.target.value.toUpperCase())}
              aria-invalid={Boolean(fields.orderNumber)}
              aria-describedby={fields.orderNumber ? "rv-order-number-error" : undefined}
              required
            />
            {fields.orderNumber && (
              <span className="rv-field-error" id="rv-order-number-error">
                {fields.orderNumber}
              </span>
            )}
            <small>It is printed on your order confirmation email.</small>
          </div>

          <div className="rv-field">
            <label htmlFor="rv-email">Email used at checkout</label>
            <input
              id="rv-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              aria-invalid={Boolean(fields.email)}
              aria-describedby={fields.email ? "rv-email-error" : undefined}
              required
            />
            {fields.email && (
              <span className="rv-field-error" id="rv-email-error">
                {fields.email}
              </span>
            )}
            <small>Your email is only used to confirm the order. It is never shown publicly.</small>
          </div>

          {/* Honeypot — hidden from people, tempting for bots. */}
          <div className="rv-hp" aria-hidden="true">
            <label htmlFor="rv-website">Website</label>
            <input
              id="rv-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
            />
          </div>

          <div className="rv-form-actions">
            <button type="submit" className="primary-button" disabled={verifying}>
              {verifying ? (
                <Loader2 size={16} className="spin" aria-hidden />
              ) : (
                <Search size={16} aria-hidden />
              )}
              {verifying ? "Checking your order…" : "Find my order"}
            </button>
            {onCancel && (
              <button type="button" className="rv-ghost-button" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        // ================= STEP 2 =================
        <form className="rv-form-body" onSubmit={send} noValidate>
          <p className="rv-verified-strip">
            <BadgeCheck size={15} aria-hidden /> Order{" "}
            <strong>{order.orderNumber}</strong> confirmed — you are a Verified Buyer.
          </p>

          {reviewable.length > 1 ? (
            <div className="rv-field">
              <label htmlFor="rv-product">Product you are reviewing</label>
              <select
                id="rv-product"
                value={form.productId}
                onChange={(event) => update("productId", event.target.value)}
                required
              >
                {reviewable.map((item) => (
                  <option key={item.productId} value={item.productId}>
                    {item.productName}
                    {item.variant ? ` — ${item.variant}` : ""}
                  </option>
                ))}
              </select>
              <button type="button" className="rv-link-button" onClick={changeOrder}>
                Not this order?
              </button>
            </div>
          ) : (
            <div className="rv-field">
              <span className="rv-label-static">Product you are reviewing</span>
              <div className="rv-chosen-product">
                {chosen?.imagePath && (
                  <img src={assetUrl(chosen.imagePath)} alt="" loading="lazy" />
                )}
                <div>
                  <strong>{chosen?.productName}</strong>
                  {chosen?.variant && <small>{chosen.variant}</small>}
                </div>
              </div>
              <button type="button" className="rv-link-button" onClick={changeOrder}>
                Not this order?
              </button>
            </div>
          )}

          <div className="rv-field">
            <label htmlFor="rv-rating-input">Your rating</label>
            <StarInput
              id="rv-rating-input"
              value={form.rating}
              onChange={(rating) => update("rating", rating)}
              error={Boolean(fields.rating)}
              disabled={submitting}
            />
            {fields.rating && <span className="rv-field-error">{fields.rating}</span>}
          </div>

          <div className="rv-field">
            <label htmlFor="rv-name">Your name</label>
            <input
              id="rv-name"
              type="text"
              autoComplete="name"
              maxLength={80}
              placeholder="e.g. Amara Silva"
              value={form.customerName}
              onChange={(event) => update("customerName", event.target.value)}
              aria-invalid={Boolean(fields.customerName)}
              required
            />
            {fields.customerName ? (
              <span className="rv-field-error">{fields.customerName}</span>
            ) : (
              <small>Shown publicly as a first name and last initial only.</small>
            )}
          </div>

          <div className="rv-field">
            <label htmlFor="rv-title">
              Review title <span className="rv-optional">(optional)</span>
            </label>
            <input
              id="rv-title"
              type="text"
              maxLength={MAX_TITLE}
              placeholder="Sum it up in a few words"
              value={form.reviewTitle}
              onChange={(event) => update("reviewTitle", event.target.value)}
            />
          </div>

          <div className="rv-field">
            <label htmlFor="rv-text">Your review</label>
            <textarea
              id="rv-text"
              rows={5}
              maxLength={MAX_TEXT}
              placeholder="What did you like or dislike? How was the fit, the fabric, the delivery?"
              value={form.reviewText}
              onChange={(event) => update("reviewText", event.target.value)}
              aria-invalid={Boolean(fields.reviewText)}
              aria-describedby={fields.reviewText ? "rv-text-error" : undefined}
              required
            />
            {fields.reviewText && (
              <span className="rv-field-error" id="rv-text-error">
                {fields.reviewText}
              </span>
            )}
            <small>
              {form.reviewText.trim().length < MIN_TEXT ? `${MIN_TEXT} characters minimum` : " "}
              {form.reviewText.length} / {MAX_TEXT}
            </small>
          </div>

          {/* The same honeypot, so a bot that only fills step 2 is caught too. */}
          <div className="rv-hp" aria-hidden="true">
            <label htmlFor="rv-website-2">Website</label>
            <input
              id="rv-website-2"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
            />
          </div>

          <div className="rv-form-actions">
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="spin" aria-hidden />
              ) : (
                <Send size={16} aria-hidden />
              )}
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <button
              type="button"
              className="rv-ghost-button"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>

          <p className="rv-form-footnote">
            Your review is checked by the StyleStore team before it appears on the website.
            Your email address is never published.
          </p>
        </form>
      )}
    </div>
  );
}
