/* ========================================
   CHECKOUT PAGE — /checkout
   Guest checkout flow:
   Contact -> Delivery -> Delivery method ->
   Payment -> Discount -> Review -> Place order.
   All totals are recalculated by the backend;
   the summary here is only a live preview.
   ======================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Lock,
  Loader2,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";

import { useCart } from "../context/useCart";
import { formatLKR } from "../format";
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  FREE_DELIVERY_THRESHOLD,
  COUNTRIES,
  DISTRICTS,
  previewDiscount,
} from "../lib/checkout";
import { validateDiscount, placeOrder } from "../lib/checkoutApi";
import { addOrderNumber } from "../lib/orderHistoryStorage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}' -]{2,80}$/u;
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,19}$/;
const TEXT_PATTERN = /^[\p{L}\p{M}' .-]{2,100}$/u;
const ADDRESS_PATTERN = /^[\p{L}\p{M}0-9' .#,/-]{5,255}$/u;
const POSTAL_PATTERN = /^[A-Za-z0-9 -]{2,20}$/;

const SERVER_MESSAGES = {
  VALIDATION_ERROR: "Please check the highlighted fields.",
  INVALID_ITEMS: "One or more items in your bag are no longer available. Please review and try again.",
  INVALID_CODE: "That discount code isn't valid anymore. Remove it to continue.",
  CODE_NOT_FOUND: "That discount code isn't valid. Remove it to continue.",
  CODE_EXPIRED: "That discount code has expired. Remove it to continue.",
  CODE_ALREADY_USED: "That discount code has already been used. Remove it to continue.",
  RATE_LIMITED: "Too many order attempts. Please wait a moment and try again.",
  DB_UNAVAILABLE: "The checkout service is temporarily unavailable. Please try again shortly.",
  ORDER_SAVE_FAILED: "We couldn't save your order right now. Please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

// Live feedback when applying a discount code. Each message is tied to the
// code the API returns so expired / used / invalid codes are explained
// clearly instead of being lumped into one generic error.
const DISCOUNT_MESSAGES = {
  INVALID_CODE: "That discount code isn't valid. Please check and try again.",
  CODE_NOT_FOUND: "That discount code isn't valid. Please check and try again.",
  CODE_EXPIRED: "That discount code has expired.",
  CODE_ALREADY_USED: "That discount code has already been used. You can only use it once.",
  RATE_LIMITED: "Too many discount checks. Please wait a moment.",
  DB_UNAVAILABLE: "We couldn't check that code right now. Please try again shortly.",
};

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  country: "Sri Lanka",
  addressLine1: "",
  city: "",
  district: "Colombo",
  postalCode: "",
};

const FIELD_ORDER = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "addressLine1",
  "city",
  "district",
  "postalCode",
  "deliveryMethod",
  "paymentMethod",
];

function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className={error ? "checkout-field has-error" : "checkout-field"}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="req-asterisk"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function RadioCard({ active, onSelect, icon, title, subtitle, extra }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={active ? "payment-option active" : "payment-option"}
      onClick={onSelect}
    >
      <span className="radio-dot" aria-hidden="true" />
      <span className="payment-option-icon">{icon}</span>
      <span className="payment-option-body">
        <strong>{title}</strong>
        {subtitle && <span className="payment-option-sub">{subtitle}</span>}
      </span>
      {extra}
    </button>
  );
}

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();

  const [form, setForm] = useState(EMPTY_FORM);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState(null); // { code, percentOff }
  const [discountError, setDiscountError] = useState("");
  const [discountBusy, setDiscountBusy] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef(null);

  // ---- Live totals (preview only — server recalculates) ----
  const subtotal = cartTotal;
  const discountAmount = previewDiscount(discount?.percentOff, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const shipping =
    afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_METHODS[deliveryMethod].fee;
  const total = afterDiscount + shipping;

  const cartPayload = useMemo(
    () =>
      cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        size: item.size || undefined,
        color: item.color || undefined,
      })),
    [cartItems]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    if (serverError) setServerError("");
  };

  const validate = () => {
    const next = {};
    const value = (key) => form[key].trim();

    if (!EMAIL_PATTERN.test(value("email"))) next.email = "Enter a valid email address.";
    if (!NAME_PATTERN.test(value("firstName"))) next.firstName = "Enter your first name.";
    if (!NAME_PATTERN.test(value("lastName"))) next.lastName = "Enter your last name.";
    if (!PHONE_PATTERN.test(value("phone"))) next.phone = "Enter a valid phone number.";
    if (!form.country.trim()) next.country = "Enter your country.";
    if (!ADDRESS_PATTERN.test(value("addressLine1")))
      next.addressLine1 = "Enter your delivery address.";
    if (!TEXT_PATTERN.test(value("city"))) next.city = "Enter your city.";
    if (!form.district.trim()) next.district = "Select your district.";
    if (form.postalCode.trim() && !POSTAL_PATTERN.test(form.postalCode.trim()))
      next.postalCode = "Postal code looks invalid.";

    return next;
  };

  const focusFirstError = (keys) => {
    for (const key of keys) {
      const el = document.getElementById(`checkout-${key}`);
      if (el) {
        el.focus({ preventScroll: true });
        return;
      }
    }
  };

  const applyDiscount = async () => {
    const code = discountInput.trim().toUpperCase();
    setDiscountError("");
    if (!code) {
      setDiscountError("Enter a discount code first.");
      return;
    }
    // The server checks "already used" against the checkout email, so the code
    // can't be meaningfully validated until the email field is filled in.
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setDiscountError("Enter your email address in the Contact section before applying a discount code.");
      return;
    }
    setDiscountBusy(true);
    const { ok, data } = await validateDiscount(code, email);
    setDiscountBusy(false);
    if (!ok) {
      setDiscount(null);
      setDiscountError(DISCOUNT_MESSAGES[data?.code] || DISCOUNT_MESSAGES.DB_UNAVAILABLE);
      return;
    }
    setDiscount({ code: data.code, percentOff: Number(data.percentOff) || 0 });
  };

  const removeDiscount = () => {
    setDiscount(null);
    setDiscountInput("");
    setDiscountError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const cleanErrors = validate();
    setErrors(cleanErrors);
    setServerError("");

    if (Object.values(cleanErrors).filter(Boolean).length > 0) {
      const first = Object.entries(cleanErrors).find(([, v]) => v)?.[0];
      focusFirstError(first ? [first] : FIELD_ORDER);
      return;
    }

    if (!deliveryMethod) setDeliveryMethod("standard");
    if (!paymentMethod) setPaymentMethod("cod");
    if (cartPayload.length === 0) {
      setServerError("Your bag is empty — add something before checking out.");
      return;
    }

    setSubmitting(true);
    const { ok, data } = await placeOrder({
      ...form,
      email: form.email.trim().toLowerCase(),
      marketingOptIn,
      deliveryMethod,
      paymentMethod,
      discountCode: discount ? discount.code : "",
      items: cartPayload,
    });
    setSubmitting(false);

    if (ok && data?.order) {
      clearCart();
      // Remember this order in localStorage for the My Orders page. This
      // happens before clearing the cart and uses its own storage key, so
      // clearing the bag never removes saved order numbers.
      addOrderNumber(data.order.orderNumber);
      navigate(`/order-success/${data.order.orderNumber}`, {
        state: { order: data.order },
        replace: true,
      });
      return;
    }

    setServerError(
      SERVER_MESSAGES[data?.code] || data?.message || SERVER_MESSAGES.INTERNAL_ERROR
    );
    if (data && ["INVALID_CODE", "CODE_NOT_FOUND", "CODE_EXPIRED", "CODE_ALREADY_USED"].includes(data.code)) {
      removeDiscount();
    }
    if (data?.fields && typeof data.fields === "object") {
      setErrors((e) => ({ ...e, ...data.fields }));
      const first = FIELD_ORDER.find((key) => data.fields[key]);
      focusFirstError(first ? [first] : FIELD_ORDER);
    }
  };

  if (cartItems.length === 0 && !submitting) {
    return (
      <section className="checkout-page">
        <div className="checkout-inner checkout-empty">
          <div className="checkout-empty-card">
            <h1>Your bag is empty</h1>
            <p>Add a few pieces you love before heading to checkout.</p>
            <Link to="/" className="primary-button checkout-link-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <form className="checkout-inner" onSubmit={handleSubmit} noValidate ref={formRef}>
        <div className="checkout-heading">
          <Link to="/" className="checkout-back">
            <ArrowLeft size={15} /> Continue shopping
          </Link>
          <h1>Checkout</h1>
          <p className="checkout-guest-note">
            Guest checkout — no account required. We&apos;ll email your confirmation to you.
          </p>
        </div>

        <div className="checkout-layout">
          {/* ============ LEFT: form ============ */}
          <div className="checkout-form">
            {/* ---- Contact ---- */}
            <section className="checkout-card" aria-labelledby="contact-title">
              <div className="checkout-card-title">
                <span className="checkout-step">01</span>
                <div>
                  <h2 id="contact-title">Contact</h2>
                  <p>Where should we send your order confirmation?</p>
                </div>
              </div>

              <Field label="Email" htmlFor="checkout-email" error={errors.email} required>
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={form.email}
                  aria-invalid={Boolean(errors.email)}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Field>

              <div className="checkout-grid-2">
                <Field label="First name" htmlFor="checkout-firstName" error={errors.firstName} required>
                  <input
                    id="checkout-firstName"
                    autoComplete="given-name"
                    placeholder="Ashan"
                    value={form.firstName}
                    aria-invalid={Boolean(errors.firstName)}
                    onChange={(e) => setField("firstName", e.target.value)}
                  />
                </Field>
                <Field label="Last name" htmlFor="checkout-lastName" error={errors.lastName} required>
                  <input
                    id="checkout-lastName"
                    autoComplete="family-name"
                    placeholder="Perera"
                    value={form.lastName}
                    aria-invalid={Boolean(errors.lastName)}
                    onChange={(e) => setField("lastName", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Phone number" htmlFor="checkout-phone" error={errors.phone} required hint="We only call if there's a delivery question.">
                <input
                  id="checkout-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+94 77 000 0000"
                  value={form.phone}
                  aria-invalid={Boolean(errors.phone)}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </Field>
            </section>

            {/* ---- Delivery address ---- */}
            <section className="checkout-card" aria-labelledby="address-title">
              <div className="checkout-card-title">
                <span className="checkout-step">02</span>
                <div>
                  <h2 id="address-title">Delivery details</h2>
                  <p>Where should we deliver your StyleStore order?</p>
                </div>
              </div>

              <div className="checkout-grid-2">
                <Field label="Country" htmlFor="checkout-country" error={errors.country} required>
                  <select
                    id="checkout-country"
                    value={form.country}
                    aria-invalid={Boolean(errors.country)}
                    onChange={(e) => setField("country", e.target.value)}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="District" htmlFor="checkout-district" error={errors.district} required>
                  <select
                    id="checkout-district"
                    value={form.district}
                    aria-invalid={Boolean(errors.district)}
                    onChange={(e) => setField("district", e.target.value)}
                  >
                    {DISTRICTS.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Street address" htmlFor="checkout-addressLine1" error={errors.addressLine1} required>
                <input
                  id="checkout-addressLine1"
                  autoComplete="street-address"
                  placeholder="House number, street, lane…"
                  value={form.addressLine1}
                  aria-invalid={Boolean(errors.addressLine1)}
                  onChange={(e) => setField("addressLine1", e.target.value)}
                />
              </Field>

              <div className="checkout-grid-2">
                <Field label="City" htmlFor="checkout-city" error={errors.city} required>
                  <input
                    id="checkout-city"
                    autoComplete="address-level2"
                    placeholder="Colombo"
                    value={form.city}
                    aria-invalid={Boolean(errors.city)}
                    onChange={(e) => setField("city", e.target.value)}
                  />
                </Field>
                <Field label="Postal code" htmlFor="checkout-postalCode" error={errors.postalCode}>
                  <input
                    id="checkout-postalCode"
                    autoComplete="postal-code"
                    placeholder="Optional"
                    value={form.postalCode}
                    aria-invalid={Boolean(errors.postalCode)}
                    onChange={(e) => setField("postalCode", e.target.value)}
                  />
                </Field>
              </div>

              <label className="checkout-consent">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                />
                <span>
                  Email me with new arrivals, exclusive offers and styling notes. I can
                  unsubscribe at any time. (Optional)
                </span>
              </label>
            </section>

            {/* ---- Delivery method ---- */}
            <section className="checkout-card" aria-labelledby="delivery-title">
              <div className="checkout-card-title">
                <span className="checkout-step">03</span>
                <div>
                  <h2 id="delivery-title">Delivery method</h2>
                  <p>Free delivery on orders over {formatLKR(FREE_DELIVERY_THRESHOLD)}.</p>
                </div>
              </div>

              <div className="payment-options" role="radiogroup" aria-label="Delivery method">
                {Object.values(DELIVERY_METHODS).map((method) => {
                  const isFree = afterDiscount >= FREE_DELIVERY_THRESHOLD;
                  return (
                    <RadioCard
                      key={method.id}
                      active={deliveryMethod === method.id}
                      onSelect={() => {
                        setDeliveryMethod(method.id);
                        if (errors.deliveryMethod) setErrors((e) => ({ ...e, deliveryMethod: undefined }));
                      }}
                      icon={<Truck size={20} />}
                      title={method.label}
                      subtitle={method.eta}
                      extra={
                        <span className="payment-option-price">
                          {isFree ? "Free" : formatLKR(method.fee)}
                        </span>
                      }
                    />
                  );
                })}
              </div>
            </section>

            {/* ---- Payment ---- */}
            <section className="checkout-card" aria-labelledby="payment-title">
              <div className="checkout-card-title">
                <span className="checkout-step">04</span>
                <div>
                  <h2 id="payment-title">Payment method</h2>
                  <p>We never ask for or store card numbers.</p>
                </div>
              </div>

              <div className="payment-options" role="radiogroup" aria-label="Payment method">
                {Object.values(PAYMENT_METHODS).map((method) => (
                  <RadioCard
                    key={method.id}
                    active={paymentMethod === method.id}
                    onSelect={() => {
                      setPaymentMethod(method.id);
                      if (errors.paymentMethod) setErrors((e) => ({ ...e, paymentMethod: undefined }));
                    }}
                    icon={method.id === "cod" ? <Banknote size={20} /> : <CreditCard size={20} />}
                    title={method.label}
                    subtitle={method.detail}
                    extra={
                      <span className="payment-option-safe">
                        <Lock size={12} /> Secure
                      </span>
                    }
                  />
                ))}
              </div>

              {paymentMethod === "bank_deposit" && (
                <div className="payment-instructions">
                  <strong>How bank deposit works</strong>
                  <ol>
                    <li>Place your order and note your order number.</li>
                    <li>Deposit <strong>{formatLKR(total)}</strong> to StyleStore&apos;s Commercial Bank account.</li>
                    <li>Use your order number as the deposit reference.</li>
                    <li>Send the deposit slip + order number to +94 77 000 0000 on WhatsApp.</li>
                  </ol>
                </div>
              )}

              {paymentMethod === "cod" && (
                <div className="payment-instructions">
                  <strong>Cash on Delivery</strong>
                  <p>
                    Pay <strong>{formatLKR(total)}</strong> in cash to our delivery partner when
                    your order arrives. Please have the exact amount ready.
                  </p>
                </div>
              )}
            </section>

            {/* ---- Discount ---- */}
            <section className="checkout-card checkout-discount" aria-labelledby="discount-title">
              <div className="checkout-card-title">
                <span className="checkout-step">05</span>
                <div>
                  <h2 id="discount-title">Discount code</h2>
                  <p>Have a code? Apply it below.</p>
                </div>
              </div>

              {discount ? (
                <div className="discount-applied">
                  <span className="discount-applied-icon">
                    <Check size={16} />
                  </span>
                  <div>
                    <strong>{discount.code} applied</strong>
                    <span>
                      {discount.percentOff}% off — saves {formatLKR(discountAmount)}
                    </span>
                  </div>
                  <button type="button" className="discount-remove" onClick={removeDiscount} aria-label="Remove discount code">
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="discount-row">
                  <div className="discount-input-wrap">
                    <Tag size={16} aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="e.g. NEWUSER"
                      value={discountInput}
                      aria-label="Discount code"
                      aria-invalid={Boolean(discountError)}
                      onChange={(e) => {
                        setDiscountInput(e.target.value.toUpperCase());
                        setDiscountError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
                    />
                  </div>
                  <button type="button" className="discount-apply" onClick={applyDiscount} disabled={discountBusy}>
                    {discountBusy ? <Loader2 size={16} className="spin" /> : "Apply"}
                  </button>
                </div>
              )}
              {discountError && (
                <p className="field-error" role="alert">
                  {discountError}
                </p>
              )}
            </section>
          </div>

          {/* ============ RIGHT: order summary ============ */}
          <aside className="checkout-summary" aria-label="Order summary">
            <div className="checkout-summary-card">
              <h2>Order summary</h2>

              <ul className="summary-items">
                {cartItems.map((item) => (
                  <li key={`${item.id}|${item.size || "none"}|${item.color || "none"}`} className="summary-item">
                    <div className="summary-item-media">
                      <img src={item.image} alt={item.name} />
                      <span className="summary-item-qty">{item.quantity}</span>
                    </div>
                    <div className="summary-item-info">
                      <strong>{item.name}</strong>
                      {item.size && <span>Size {item.size}</span>}
                      {item.color && <span className="summary-color" style={{ background: item.color }} />}
                      <span className="summary-unit-price">{formatLKR(item.price)} each</span>
                    </div>
                    <div className="summary-item-price-col">
                      <span className="summary-line-qty">Qty {item.quantity}</span>
                      <span className="summary-item-price">
                        {formatLKR(item.price * item.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="summary-totals">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{formatLKR(subtotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Discount</span>
                  <strong className={discountAmount > 0 ? "summary-positive" : ""}>
                    {discountAmount > 0 ? `-${formatLKR(discountAmount)}` : "—"}
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Delivery</span>
                  <strong>{shipping === 0 ? "Free" : formatLKR(shipping)}</strong>
                </div>
                <div className="summary-line summary-total">
                  <span>Total</span>
                  <strong>{formatLKR(total)}</strong>
                </div>
              </div>

              {serverError && (
                <div className="checkout-server-error" role="alert">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button place-order-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="spin" /> Placing your order…
                  </>
                ) : (
                  <>
                    <Lock size={15} /> Place Order &mdash; {formatLKR(total)}
                  </>
                )}
              </button>

              <p className="summary-secure-note">
                <Lock size={13} /> Totals are verified securely on our server before your order is saved.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

export default Checkout;