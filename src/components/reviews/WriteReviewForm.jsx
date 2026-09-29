/* ========================================================
   WRITE A REVIEW FORM
   --------------------------------------------------------
   Two steps, no account and no signup.

   Step 1 — Find your order
     Order number + the email used at checkout. The server
     checks that pair against the orders table and answers with
     the products in that order only, so a customer can never
     even be offered a product they did not buy. It also reports
     whether the order has been DELIVERED, and nothing can be
     reviewed until it has — a parcel still in transit is not a
     finished purchase.

   Step 2 — Write your review
     Pick one of the products, choose 1–5 stars, add an optional
     title and a short message, and the name you would like
     shown. The server re-checks the order from scratch, verifies
     the delivered status, the purchased product, the one-review
     -per-item rule, the rating and the text, then marks the
     review "Verified Buyer" and PUBLISHES it immediately
     (status = approved).

   ITEM MODE
     When the customer clicks "Write a review" on a specific line
     in My Orders, the dialog is opened with that line already
     locked in (`item`). The order lookup still runs and the
     server still decides whether the review is allowed — the lock
     is only so the customer does not have to choose again. A
     server refusal (not delivered, already reviewed) is shown as
     a clear message instead of the form.

   Nothing here trusts the browser: the verification result, the
   product list and the Verified Buyer flag all come from the
   server, never from local state. After a successful submit the
   form announces the new review through reviewEvents.js, which
   makes the product reviews and the "Loved by our customers"
   section refresh without a full-page reload.
   ======================================================== */
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Loader2, Search, Send, Truck } from "lucide-react";

import { submitReview, verifyOrderForReview } from "../../lib/reviewApi";
import { notifyReviewPublished } from "../../lib/reviewEvents";
import { assetUrl } from "../../lib/productApi";
import { StarInput } from "./StarRating";

const MAX_TITLE = 160;
const MAX_TEXT = 2000;
const MIN_TEXT = 10;

const EMPTY_FORM = {
  orderNumber: "",
  email: "",
  productId: "",
  customerName: "",
  rating: 0,
  reviewTitle: "",
  reviewText: "",
  // Honeypot: a real person never sees or fills this field.
  website: "",
};

/**
 * @param initialOrderNumber  Prefills the order field, e.g. from the order
 *                            history page.
 * @param item                Optional `{ productId, productName, variant }`
 *                            for a locked single-item review. The order
 *                            number/email lookup and every server check still
 *                            happen; this only skips the picker.
 * @param onReviewSubmitted   Called after a successful publish with the
 *                            product id, so the caller can refresh whatever
 *                            list it is showing (e.g. My Orders).
 */
export default function WriteReviewForm({
  initialOrderNumber = "",
  item = null,
  onDone,
  onCancel,
  onReviewSubmitted,
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    orderNumber: initialOrderNumber,
    productId: item?.productId ?? "",
  });
  const [order, setOrder] = useState(null);
  const [fields, setFields] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Item mode only: the order was proven, but this exact line cannot be
  // reviewed (not delivered yet, or it already has a review).
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState(null);
  const headingRef = useRef(null);
  // A synchronous lock, separate from the `verifying` / `submitting` state.
  // React state updates are batched, so two very fast clicks can both see the
  // old `false`; this ref is flipped immediately, before any await, and is
  // what actually stops a repeated fast click from sending twice.
  const inFlightRef = useRef(false);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFields((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  // Move focus to the top of the dialog when it opens so screen-reader and
  // keyboard users are not left at the bottom of the page.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // `reviewable` trusts the server's own `reviewable` flag, which already
  // accounts for both "already reviewed" and "not delivered yet". Falling back
  // to the local check keeps this working if an older server omits the flag.
  const items = order?.products || [];
  const reviewable = items.filter((item_) => item_.reviewable ?? !item_.alreadyReviewed);
  const chosen = reviewable.find((item_) => Number(item_.productId) === Number(form.productId));

  // ---- Step 1: verify the order number + email ----
  const findOrder = async (event) => {
    event.preventDefault();
    // Ignore a second click while the first lookup is still running.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setVerifying(true);
    setMessage(null);
    setFields({});
    try {
      const result = await verifyOrderForReview(form.orderNumber, form.email);
      setOrder(result);

      // Work out what the customer is allowed to review right now, using the
      // server's own verdict rather than a local guess.
      const available = (result.products || []).filter(
        (entry) => entry.reviewable ?? !entry.alreadyReviewed
      );

      // In item mode the product is already fixed, so the lookup only has to
      // confirm that specific line is still reviewable.
      if (item) {
        const requested = Number(item.productId);
        if (!available.some((entry) => Number(entry.productId) === requested)) {
          // Blocked: the order exists and is proven, but this exact line
          // cannot be reviewed. Do not offer the customer's other products —
          // they asked about this one.
          setBlocked(true);
        }
        return;
      }

      // Outside item mode, pre-select the first reviewable product so the
      // single-item case never shows an empty picker. When nothing is
      // reviewable the step-2 empty state explains why.
      if (available.length > 0) {
        setForm((current) => ({ ...current, productId: available[0].productId }));
      }
    } catch (error) {
      setOrder(null);
      setFields(error.fields || {});
      setMessage({ type: "error", text: error.message });
    } finally {
      inFlightRef.current = false;
      setVerifying(false);
    }
  };

  const changeOrder = () => {
    setOrder(null);
    setBlocked(false);
    setForm((current) => ({ ...current, productId: "" }));
    setMessage(null);
    setFields({});
  };

  // ---- Step 2: submit the review ----
  const send = async (event) => {
    event.preventDefault();
    // The same lock as step 1: a rapid double-click must not create two
    // reviews. The server still has the UNIQUE index as a second guard.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
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
      // The review is already live on the server. Announce it so the product
      // reviews and the "Loved by our customers" section refetch themselves
      // immediately — no full-page refresh.
      notifyReviewPublished({
        productId: Number(form.productId),
        review: result.review || null,
      });
      // Let the caller (e.g. My Orders) refresh the line it just reviewed.
      onReviewSubmitted?.(Number(form.productId));
      // The dialog deliberately stays open: the customer must be able to read
      // the confirmation before it closes, so `onDone` is only called by the
      // Close button on the success screen below.
    } catch (error) {
      setFields(error.fields || {});
      setMessage({ type: "error", text: error.message });
    } finally {
      inFlightRef.current = false;
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
            Your verified review of <strong>{chosen.productName}</strong> is now live on the
            website and is already counted in its rating.
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

      {/* Item mode: the product is already chosen, so it is shown as a fixed
          card above the lookup instead of a dropdown. */}
      {item && !order && (
        <div className="rv-chosen-product rv-chosen-locked">
          {item.imagePath && <img src={assetUrl(item.imagePath)} alt="" loading="lazy" />}
          <div>
            <strong>{item.productName}</strong>
            {item.variant && <small>{item.variant}</small>}
          </div>
        </div>
      )}

      {!order ? (
        // ================= STEP 1 =================
        <form className="rv-form-body" onSubmit={findOrder} noValidate>
          <p className="rv-form-lead">
            {item ? (
              <>
                Confirm the order this item came from. Reviews open once your order has been
                delivered.
              </>
            ) : (
              <>
                No account needed. Enter your order number and the email address you used at
                checkout, then tell us what you thought.
              </>
            )}
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
            <strong>{order.orderNumber}</strong> confirmed
            {/* The Verified Buyer badge belongs to a published review, so it is
                only claimed once this order has something reviewable. For an
                undelivered order the strip confirms the order and stops there —
                the message below explains when reviews open. */}
            {blocked || reviewable.length === 0 ? "." : " — you are a Verified Buyer."}
          </p>

          {blocked || reviewable.length === 0 ? (
            // The order exists and is proven, but nothing here can be
            // reviewed: the order has not been delivered, or this line
            // already has a review.
            <>
              <p className="rv-alert rv-alert-info" role="status">
                <Truck size={15} aria-hidden />{" "}
                {order.message ||
                  (order.delivered === false
                    ? "Reviews open once your order has been delivered."
                    : "You have already reviewed every item in this order. Thank you!")}
              </p>
              <div className="rv-form-actions">
                {!item && (
                  <button type="button" className="rv-ghost-button" onClick={changeOrder}>
                    Try another order
                  </button>
                )}
                {onDone && (
                  <button type="button" className="secondary-button" onClick={onDone}>
                    Close
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {!item && reviewable.length > 1 ? (
                <div className="rv-field">
                  <label htmlFor="rv-product">Product you are reviewing</label>
                  <select
                    id="rv-product"
                    value={form.productId}
                    onChange={(event) => update("productId", event.target.value)}
                    required
                  >
                    {reviewable.map((entry) => (
                      <option key={entry.productId} value={entry.productId}>
                        {entry.productName}
                        {entry.variant ? ` — ${entry.variant}` : ""}
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
                  {!item && (
                    <button type="button" className="rv-link-button" onClick={changeOrder}>
                      Not this order?
                    </button>
                  )}
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
                  {form.reviewText.trim().length < MIN_TEXT
                    ? `${MIN_TEXT} characters minimum`
                    : " "}
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
                {onCancel && (
                  <button
                    type="button"
                    className="rv-ghost-button"
                    onClick={onCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <p className="rv-form-footnote">
                Your review is verified against your order and published straight away. The
                StyleStore team can still hide it if it breaks our guidelines. Your email address
                is never published.
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
}
