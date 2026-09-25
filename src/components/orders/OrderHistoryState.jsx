/* ========================================
   1. IMPORTS
======================================== */
import { Link } from "react-router-dom";
import { PackageOpen, WifiOff } from "lucide-react";

/* ========================================
   2. LOADING SKELETON
======================================== */
function OrdersLoading() {
  return (
    <div className="orders-skeleton" role="status" aria-label="Loading your orders">
      <div className="orders-skeleton-card" />
      <div className="orders-skeleton-card" />
      <div className="orders-skeleton-card" />
      <span className="sr-only">Loading your orders…</span>
    </div>
  );
}

/* ========================================
   3. EMPTY HISTORY
======================================== */
function OrdersEmpty({ hasStored }) {
  return (
    <div className="orders-state">
      <span className="orders-state-icon">
        <PackageOpen size={28} aria-hidden="true" />
      </span>
      <h3>No orders yet</h3>
      <p>
        {hasStored
          ? "We couldn't find any orders placed from this browser. If this doesn't look right, wait a moment and refresh."
          : "No orders have been placed from this browser yet."}
      </p>
      <Link to="/" className="orders-btn orders-btn--dark">
        Start Shopping
      </Link>
    </div>
  );
}

/* ========================================
   4. ERROR / CONNECTION STATE
======================================== */
function OrdersError({ message, onRetry }) {
  return (
    <div className="orders-state orders-state--error" role="alert">
      <span className="orders-state-icon">
        <WifiOff size={26} aria-hidden="true" />
      </span>
      <h3>Couldn't load your orders</h3>
      <p>{message || "We couldn't reach the StyleStore server. Please try again."}</p>
      <div className="orders-state-actions">
        <button type="button" className="orders-btn" onClick={onRetry}>
          Retry
        </button>
        <Link to="/" className="orders-btn orders-btn--ghost">
          Start Shopping
        </Link>
      </div>
    </div>
  );
}

/* ========================================
   5. EXPORTS
======================================== */
export { OrdersLoading, OrdersEmpty, OrdersError };