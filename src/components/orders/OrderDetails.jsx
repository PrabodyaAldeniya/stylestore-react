/* ========================================
   1. IMPORTS
   --------------------------------------------------------
   The review buttons here are the natural place to review a
   purchase: the customer already has the order open, and the
   server has told us per line whether that line can still be
   reviewed. Only `canReview` / `reviewed` are used — no review id
   or order-item id ever reaches the browser.
   ======================================== */
import { useEffect, useRef } from "react";
import { CheckCircle2, Truck, X } from "lucide-react";

import { formatLKR } from "../../format";
import { formatOrderDate, getProductImage, isHexColor } from "../../lib/orderHistoryHelpers";
import { getPublicSizeDisplay } from "../../lib/publicSizeDisplay";
import OrderStatusBadge from "./OrderStatusBadge";
import WriteReviewDialog from "../reviews/WriteReviewDialog";

/* ========================================
   2. ORDER DETAILS MODAL
   ======================================== */
// Accessible dialog: Escape or backdrop click closes it, focus moves to the
// close button while open and returns to the trigger when closed.
//
// `onReviewSubmitted` lets the parent refresh the order so the line it just
// reviewed flips to "Reviewed" without the customer doing anything.
function OrderDetails({ order, onClose, onReviewSubmitted }) {
  const closeButtonRef = useRef(null);


  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div
        className="order-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.orderNumber} details`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ---- Header ---- */}
        <header className="order-modal-header">
          <div>
            <span className="order-card-eyebrow">Order details</span>
            <h3>{order.orderNumber}</h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button order-modal-close"
            aria-label="Close order details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <OrderStatusBadge status={order.status} />

        {/* ---- Order facts ---- */}
        <dl className="order-modal-facts">
          <div>
            <dt>Placed on</dt>
            <dd>
              <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{order.paymentLabel || order.paymentMethod}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>
              <Truck size={13} aria-hidden="true" /> {order.deliveryLabel || order.deliveryMethod}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{order.status}</dd>
          </div>
        </dl>

        {/* ---- Items ---- */}
        <h4 className="order-modal-subtitle">Items ({order.items.length})</h4>
        {/* Reviews only open once the order has been delivered. This explains
            the disabled buttons instead of hiding them. */}
        {order.reviewsOpen === false && (
          <p className="order-modal-review-note">
            <Truck size={14} aria-hidden="true" /> Reviews open once this order has been
            delivered.
          </p>
        )}
        <ul className="order-modal-items">
          {order.items.map((item) => {
             const image = getProductImage(item);
            return (
              <li key={`${item.productId}|${item.size || ""}|${item.color || ""}`} className="order-modal-item">
                {image ? (
                  <img className="order-modal-item-img" src={image} alt="" loading="lazy" />
                ) : (
                  <span className="order-modal-item-img order-modal-item-img--placeholder" aria-hidden="true" />
                )}

                <div className="order-modal-item-info">
                  <strong>{item.productName}</strong>
                  <span className="order-modal-item-variant">
                    {isHexColor(item.color) && (
                      <span
                        className="order-color-swatch"
                        style={{ background: item.color }}
                        title={item.color}
                        aria-hidden="true"
                      />
                    )}
                   {/* ---- Variant line ----
                       The size is shown through the public-display helper, so
                       a stored "Free Size" reads as the customer's
                       "Fit: Adjustable" / "Size: One Size" without touching
                       what the order actually stores. A Not Applicable line
                       (a tote bag, say) stores no size, so no size text is
                       printed at all — "One size" was only ever a stand-in and
                       was never literally true. */}
                    {[getPublicSizeDisplay(item).text || "", item.color && !isHexColor(item.color) ? item.color : ""]
                      .filter(Boolean)
                      .join(" · ") || null}
                  </span>
                  <span className="order-modal-item-unit">
                    {formatLKR(item.unitPrice)} each × {item.quantity}
                  </span>

                  {/* ---- Per-line review action ----
                      Three states, driven entirely by the server's own verdict
                      on that order line. */}
                  <div className="order-modal-item-review">
                    {item.reviewed ? (
                      <span className="order-modal-reviewed">
                        <CheckCircle2 size={13} aria-hidden="true" /> Reviewed
                      </span>
                    ) : item.canReview ? (
                      <WriteReviewDialog
                        label="Write a review"
                        variant="link"
                        initialOrderNumber={order.orderNumber}
                        item={{
                          productId: Number(item.productId),
                          productName: item.productName,
                          variant: [item.size, item.color && !isHexColor(item.color) ? item.color : ""]
                            .filter(Boolean)
                            .join(" · "),
                          imagePath: item.productImagePath,
                        }}
                        onReviewSubmitted={onReviewSubmitted}
                      />
                    ) : (
                      <span className="order-modal-review-pending">
                        {order.reviewsOpen === false
                          ? "Available after delivery"
                          : "Ready to review once eligible"}
                      </span>
                    )}
                  </div>
                </div>

                <span className="order-modal-item-price">
                  {formatLKR(item.unitPrice * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* ---- Totals ---- */}
        <div className="order-modal-totals">
          <div className="order-total-rows">
            <div>
              <span>Subtotal</span>
              <span>{formatLKR(order.subtotal)}</span>
            </div>
            <div>
              <span>Discount</span>
              <span className={Number(order.discount) > 0 ? "order-total-positive" : ""}>
                {Number(order.discount) > 0 ? `-${formatLKR(order.discount)}` : "—"}
              </span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{order.shipping === 0 ? "Free" : formatLKR(order.shipping)}</span>
            </div>
          </div>
          <div className="order-total-rows order-total-rows--main">
            <div>
              <span>Total</span>
              <strong>{formatLKR(order.total)}</strong>
            </div>
          </div>
          {order.discountCode && (
            <p className="order-modal-code">
              <CheckCircle2 size={13} aria-hidden="true" /> Discount code applied:{" "}
              <strong>{order.discountCode}</strong>
            </p>
          )}
        </div>

        {/* ---- Actions ---- */}
        <button type="button" className="orders-btn orders-btn--ghost order-modal-done" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default OrderDetails;