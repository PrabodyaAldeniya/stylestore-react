/* ========================================
   ORDER SUCCESS — /order-success/:orderNumber
   Shows the order number, total and payment
   instructions after a successful checkout.
   If the page is refreshed (state lost) the
   summary is re-fetched from the backend.
   ======================================== */
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Banknote, CreditCard, Home, Loader2, PackageCheck } from "lucide-react";

import { formatLKR } from "../format";
import { fetchOrder } from "../lib/checkoutApi";

function BankInstructions({ total }) {
  return (
    <div className="success-instructions">
      <h3>Pay by bank deposit to complete your order</h3>
      <ol>
        <li>
          Deposit <strong>{formatLKR(total)}</strong> to:
          <ul className="success-bank">
            <li>Account name: StyleStore Retail (Pvt) Ltd</li>
            <li>Bank: Commercial Bank of Ceylon</li>
            <li>Account number: 1200 1234 5678</li>
          </ul>
        </li>
        <li>Use your order number as the deposit reference.</li>
        <li>
          Send the deposit slip and your order number to{" "}
          <strong>+94 77 000 0000</strong> (WhatsApp) so we can confirm and dispatch.
        </li>
      </ol>
    </div>
  );
}

function CodInstructions({ total }) {
  return (
    <div className="success-instructions">
      <h3>Cash on Delivery</h3>
      <p>
        Please have <strong>{formatLKR(total)}</strong> in cash ready when our delivery
        partner arrives. Your order will be dispatched once confirmed.
      </p>
    </div>
  );
}

function OrderSuccess() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const initial = location.state?.order;

  const [order, setOrder] = useState(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (initial || !orderNumber) return;

    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchOrder(orderNumber);
      if (cancelled) return;
      if (ok && data?.order) setOrder(data.order);
      else setFetchFailed(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, orderNumber]);

  return (
    <section className="checkout-page">
      <div className="checkout-inner success-wrap">
        <div className="success-card">
          <div className="success-icon">
            <PackageCheck size={30} />
          </div>

          <span className="eyebrow">ORDER CONFIRMED</span>

          {loading ? (
            <p className="success-loading">
              <Loader2 size={16} className="spin" /> Loading your order…
            </p>
          ) : order ? (
            <>
              <h1>Thank you, {order.firstName || "friend"}!</h1>
              <p className="success-lead">
                Your order has been placed. We&apos;ve sent a confirmation email to{" "}
                <strong>{order.email || "your inbox"}</strong>.
              </p>

              <div className="success-order-box">
                <div>
                  <span>Order number</span>
                  <strong>{order.orderNumber}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatLKR(order.total)}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{order.paymentLabel}</strong>
                </div>
              </div>

              {order.deliveryLabel && (
                <p className="success-delivery">
                  <span className="success-payment-icon">
                    {order.paymentMethod === "bank_deposit" ? (
                      <CreditCard size={15} />
                    ) : (
                      <Banknote size={15} />
                    )}
                  </span>
                  Delivery: <strong>{order.deliveryLabel}</strong>
                </p>
              )}

              {order.paymentMethod === "bank_deposit" ? (
                <BankInstructions total={order.total} />
              ) : (
                <CodInstructions total={order.total} />
              )}

              <p className="success-footnote">
                Note: your order is saved immediately even if the confirmation email is
                delayed. Feel free to keep this page for your records.
              </p>
            </>
          ) : (
            <>
              <h1>Order received</h1>
              <p className="success-lead">
                {fetchFailed ? (
                  <>We couldn&apos;t load the details for order <strong>{orderNumber}</strong> right now.</>
                ) : (
                  <>Your order number is <strong>{orderNumber}</strong>.</>
                )}
              </p>
              {fetchFailed ? (
                <div className="success-instructions">
                  <h3>Your order is safe</h3>
                  <p>
                    The order is saved on our side. If you need your order number, total or
                    payment instructions again, contact us on +94 77 000 0000 and we&apos;ll help
                    right away.
                  </p>
                </div>
              ) : (
                <BankInstructions total={0} />
              )}
            </>
          )}

          <div className="success-actions">
            <Link to="/" className="primary-button success-home-btn">
              <Home size={16} /> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrderSuccess;