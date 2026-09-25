/* ========================================
   1. IMPORTS
======================================== */
import { ReceiptText } from "lucide-react";

import { formatLKR } from "../../format";
import { formatOrderDate, getProductImage, isHexColor } from "../../lib/orderHistoryHelpers";
import OrderStatusBadge from "./OrderStatusBadge";

/* ========================================
   2. ITEM VARIANT LABEL
======================================== */
// Size + colour pill. Hex colours render as a swatch dot; anything else is
// shown as plain text (e.g. a future named colour).
function ItemVariant({ size, color }) {
  const parts = [];
  if (size) parts.push(`Size ${size}`);
  if (color && !isHexColor(color)) parts.push(color);

  return (
    <span className="order-card-item-variant">
      {isHexColor(color) && (
        <span className="order-color-swatch" style={{ background: color }} title={color} aria-hidden="true" />
      )}
      {parts.length > 0 ? parts.join(" · ") : "One size"}
    </span>
  );
}

/* ========================================
   3. ORDER CARD COMPONENT
======================================== */
function OrderCard({ order, onViewDetails }) {
  return (
    <article className="order-card">
      {/* ---- Card header: number + status + date/payment ---- */}
      <header className="order-card-header">
        <div className="order-card-headline">
          <span className="order-card-eyebrow">Order number</span>
          <strong className="order-card-number">{order.orderNumber}</strong>
          <div className="order-card-meta">
            <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>
            <span className="order-card-meta-dot" aria-hidden="true">•</span>
            <span>{order.paymentLabel || order.paymentMethod}</span>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {/* ---- Items preview ---- */}
      <ul className="order-card-items">
        {order.items.map((item) => {
          const image = getProductImage(item.productId);
          return (
            <li
              key={`${item.productId}|${item.size || ""}|${item.color || ""}`}
              className="order-card-item"
            >
              {image ? (
                <img
                  className="order-card-item-img"
                  src={image}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className="order-card-item-img order-card-item-img--placeholder" aria-hidden="true" />
              )}

              <div className="order-card-item-info">
                <strong>{item.productName}</strong>
                <ItemVariant size={item.size} color={item.color} />
              </div>

              <div className="order-card-item-cols">
                <span className="order-card-item-qty">Qty {item.quantity}</span>
                <span className="order-card-item-price">
                  {formatLKR(item.unitPrice * item.quantity)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ---- Totals strip ---- */}
      <dl className="order-card-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatLKR(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd className={Number(order.discount) > 0 ? "order-total-positive" : ""}>
            {Number(order.discount) > 0 ? `-${formatLKR(order.discount)}` : "—"}
          </dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{order.shipping === 0 ? "Free" : formatLKR(order.shipping)}</dd>
        </div>
        <div className="order-card-total">
          <dt>Total</dt>
          <dd>{formatLKR(order.total)}</dd>
        </div>
      </dl>

      {/* ---- Actions ---- */}
      <footer className="order-card-footer">
        <button
          type="button"
          className="order-details-btn"
          onClick={() => onViewDetails(order)}
        >
          <ReceiptText size={15} /> View Details
        </button>
      </footer>
    </article>
  );
}

export default OrderCard;