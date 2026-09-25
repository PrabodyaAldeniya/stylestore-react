/* ========================================
   1. IMPORTS
======================================== */
import { useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";

import { lookupOrder } from "../../lib/orderHistoryApi";
import OrderCard from "./OrderCard";
import OrderDetails from "./OrderDetails";

/* ========================================
   2. CONSTANTS
======================================== */
const ORDER_PATTERN = /^SS-\d{8}-[A-Z0-9]{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_FEEDBACK = { type: "", title: "", message: "" };

/* ========================================
   3. COMPONENT
======================================== */
// Lets a customer on another browser/device find one of their orders using
// the order number AND the exact checkout email. Success renders the found
// order as a normal order card; every failure shows a clear, safe message.
function OrderLookupForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [busy, setBusy] = useState(false);
  const [resultOrder, setResultOrder] = useState(null);
  const [displayedOrder, setDisplayedOrder] = useState(null);

  /* ===== 4. EVENT HANDLERS ===== */

  const submitLookup = async (event) => {
    event.preventDefault();

    const cleanNumber = orderNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const errors = {};
    if (!ORDER_PATTERN.test(cleanNumber)) {
      errors.orderNumber = "Enter a valid order number (e.g. SS-20260925-ABCDE).";
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      errors.email = "Enter the email address used at checkout.";
    }
    setFieldErrors(errors);
    setFeedback(EMPTY_FEEDBACK);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    const { ok, status, data } = await lookupOrder(cleanNumber, cleanEmail);
    setBusy(false);

    if (ok && data?.order) {
      setResultOrder(data.order);
      setFeedback({
        type: "success",
        title: "Order found",
        message: `Order ${data.order.orderNumber} was found.`,
      });
      return;
    }

    // Every failure path clears any previous result.
    setResultOrder(null);
    if (status === 404 || data?.code === "ORDER_NOT_FOUND") {
      setFeedback({
        type: "error",
        title: "Order not found",
        message: "We couldn't find an order matching that order number and email.",
      });
    } else if (status === 0) {
      setFeedback({
        type: "error",
        title: "Connection problem",
        message: "We couldn't reach the StyleStore server. Check your connection and try again.",
      });
    } else {
      setFeedback({
        type: "error",
        title: "Something went wrong",
        message: data?.message || "Please try again shortly.",
      });
    }
  };

  /* ===== 5. UI RENDERING ===== */

  return (
    <div>
      <form className="orders-lookup-form" onSubmit={submitLookup} noValidate>
        <div className={fieldErrors.orderNumber ? "orders-field has-error" : "orders-field"}>
          <label htmlFor="lookup-order-number">Order number</label>
          <input
            id="lookup-order-number"
            type="text"
            placeholder="SS-00000000-XXXXX"
            value={orderNumber}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.orderNumber)}
            onChange={(event) => {
              setOrderNumber(event.target.value);
              setFieldErrors((current) => ({ ...current, orderNumber: undefined }));
            }}
          />
          {fieldErrors.orderNumber && (
            <p className="orders-field-error" role="alert">
              {fieldErrors.orderNumber}
            </p>
          )}
        </div>

        <div className={fieldErrors.email ? "orders-field has-error" : "orders-field"}>
          <label htmlFor="lookup-email">Checkout email address</label>
          <input
            id="lookup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
          />
          {fieldErrors.email && (
            <p className="orders-field-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="orders-btn orders-btn--primary orders-lookup-submit"
          disabled={busy}
        >
          {busy ? <Loader2 size={16} className="spin" /> : <Search size={16} aria-hidden="true" />}
          Find Order
        </button>
      </form>

      <p className="orders-lookup-note">
        <ShieldCheck size={14} aria-hidden="true" />
        We only reveal an order when the order number and the checkout email both match.
      </p>

      {/* ---- Feedback message ---- */}
      {feedback.title && (
        <div className={`orders-feedback orders-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          <strong>{feedback.title}</strong>
          {feedback.message}
        </div>
      )}

      {/* ---- Found order ---- */}
      {resultOrder && (
        <div className="orders-lookup-result">
          <OrderCard order={resultOrder} onViewDetails={setDisplayedOrder} />
        </div>
      )}

      {/* ---- Details modal for the lookup result ---- */}
      {displayedOrder && (
        <OrderDetails order={displayedOrder} onClose={() => setDisplayedOrder(null)} />
      )}
    </div>
  );
}

export default OrderLookupForm;