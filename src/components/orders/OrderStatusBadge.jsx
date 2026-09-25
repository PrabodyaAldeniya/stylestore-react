/* ========================================
   1. IMPORTS
======================================== */

/* ========================================
   2. STATUS CONFIG
======================================== */
// The database stores lowercase status strings. `placed` is the value the
// checkout API writes for brand-new orders — treated as "Pending". Unknown
// statuses fall back to a neutral grey badge showing the raw label.
const STATUS_META = {
  placed: { label: "Pending", tone: "pending" },
  pending: { label: "Pending", tone: "pending" },
  confirmed: { label: "Confirmed", tone: "confirmed" },
  processing: { label: "Processing", tone: "processing" },
  shipped: { label: "Shipped", tone: "shipped" },
  delivered: { label: "Delivered", tone: "delivered" },
  cancelled: { label: "Cancelled", tone: "cancelled" },
};

/* ========================================
   3. COMPONENT
======================================== */
function OrderStatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const meta = STATUS_META[key] || {
    label: key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown",
    tone: "default",
  };

  return (
    <span className={`order-status order-status--${meta.tone}`}>{meta.label}</span>
  );
}

export default OrderStatusBadge;