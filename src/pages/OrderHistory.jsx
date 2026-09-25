/* ========================================
   1. IMPORTS
======================================== */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";

import { formatLKR } from "../format";
import { fetchOrderHistory } from "../lib/orderHistoryApi";
import { getStoredOrderNumbers, hasStoredOrderNumbers } from "../lib/orderHistoryStorage";
import { OrdersEmpty, OrdersError, OrdersLoading } from "../components/orders/OrderHistoryState";
import OrderCard from "../components/orders/OrderCard";
import OrderDetails from "../components/orders/OrderDetails";
import OrderLookupForm from "../components/orders/OrderLookupForm";

/* ========================================
   2. INITIAL STATE
======================================== */
// Status machine for the browser-order list:
//   loading  -> fetch in progress (skeleton)
//   success  -> orders loaded from the backend
//   error    -> backend unreachable (retry button)
//   empty    -> nothing stored on this device yet
// The initial status is DERIVED from localStorage, so an empty device never
// fires a pointless request and always shows the friendly empty state.
function initialStatus() {
  return hasStoredOrderNumbers() ? "loading" : "empty";
}

/* ========================================
   3. PAGE COMPONENT
======================================== */
// Guest order history: reads the order numbers saved in localStorage after
// each checkout, then asks the backend for the matching real orders. The
// list survives a browser refresh because the numbers stay in localStorage.
function OrderHistory() {
  const [status, setStatus] = useState(initialStatus);
  const [orders, setOrders] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [displayedOrder, setDisplayedOrder] = useState(null);

  /* ===== 4. LOAD STORED ORDERS ===== */

  useEffect(() => {
    window.scrollTo(0, 0);

    const storedNumbers = getStoredOrderNumbers();
    if (storedNumbers.length === 0) return;

    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchOrderHistory(storedNumbers);
      if (cancelled) return;
      if (ok && Array.isArray(data?.orders)) {
        setOrders(data.orders);
        setStatus("success");
      } else {
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  };

  /* ===== 5. UI RENDERING ===== */

  return (
    <section className="orders-page">
      <div className="orders-inner">
        {/* ---- Page heading ---- */}
        <header className="orders-heading">
          <Link to="/" className="orders-back">
            <ArrowLeft size={15} /> Back to store
          </Link>
          <span className="eyebrow">ORDER HISTORY</span>
          <h1>My Orders</h1>
          <p className="orders-lead">
            Your orders from this browser, with delivery updates and totals at a glance.
          </p>
          <div className="orders-actions">
            <Link to="/" className="orders-btn orders-btn--dark">
              <Package size={16} aria-hidden="true" /> Continue Shopping
            </Link>
          </div>
        </header>

        {/* ---- Orders placed from this browser ---- */}
        <section className="orders-section" aria-labelledby="browser-orders-title">
          <h2 className="orders-section-title" id="browser-orders-title">Your orders</h2>
          <p className="orders-section-sub">
            Saved on this device after checkout — no account needed.
          </p>

          {status === "loading" && <OrdersLoading />}
          {status === "error" && (
            <OrdersError
              message="We couldn't reach the StyleStore server. Your order numbers are safe on this device."
              onRetry={retry}
            />
          )}
          {status === "success" && orders.length === 0 && <OrdersEmpty hasStored />}
          {status === "empty" && <OrdersEmpty />}
          {status === "success" && orders.length > 0 && (
            <>
              <div className="orders-list">
                {orders.map((order) => (
                  <OrderCard
                    key={order.orderNumber}
                    order={order}
                    onViewDetails={setDisplayedOrder}
                  />
                ))}
              </div>
              <p className="orders-summary-note">
                Showing {orders.length} order{orders.length === 1 ? "" : "s"} ·{" "}
                {formatLKR(
                  orders.reduce((total, order) => total + Number(order.total), 0)
                )}{" "}
                spent in total.
              </p>
            </>
          )}
        </section>

        {/* ---- Lookup from another device ---- */}
        <section className="orders-section" aria-labelledby="lookup-title">
          <div className="orders-lookup-card">
            <span className="eyebrow">ORDER LOOKUP</span>
            <h2 className="orders-section-title" id="lookup-title">
              Find an order from another device
            </h2>
            <p className="orders-section-sub">
              On a new phone or browser? Enter your order number and the email you used at
              checkout and we&apos;ll pull it up.
            </p>
            <OrderLookupForm />
          </div>
        </section>
      </div>

      {/* ---- Details modal for the browser-order list ---- */}
      {displayedOrder && (
        <OrderDetails order={displayedOrder} onClose={() => setDisplayedOrder(null)} />
      )}
    </section>
  );
}

export default OrderHistory;