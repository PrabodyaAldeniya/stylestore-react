/* ========================================================
   PRODUCT REVIEWS
   --------------------------------------------------------
   The published (approved), product-specific reviews shown
   inside the Quick View and the product detail area.

   It reads GET /api/products/:id/reviews, which returns only
   approved reviews plus the average rating and review count
   calculated from those same approved reviews — so the number
   next to the stars can never disagree with the cards below it.

   LIVE REFRESH: it also subscribes to reviewEvents.js. When the
   review form publishes a review for this product, the list is
   fetched again automatically, so the new review appears without
   a full-page refresh.

   Loading, API-error and "no reviews yet" states are all
   handled: this component never falls back to sample reviews.
   ======================================================== */
import { useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";

import { fetchProductReviews } from "../../lib/reviewApi";
import { onReviewPublished } from "../../lib/reviewEvents";
import ReviewCard from "./ReviewCard";
import { Stars } from "./StarRating";
import WriteReviewDialog from "./WriteReviewDialog";

/** "4.5" + 12 -> "4.5 · 12 reviews" */
function summaryLine(summary) {
  if (!summary?.reviewCount) return "No reviews yet";
  const average = Number(summary.averageRating || 0).toFixed(1);
  return `${average} · ${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"}`;
}

export default function ProductReviews({ productId, productName, limit }) {
  const [state, setState] = useState({ status: "loading", reviews: [], summary: null });
  const [attempt, setAttempt] = useState(0);
  // Remembered so a change of product can clear the previous product's reviews
  // during render — see the reset just above the return.
  const [shownProductId, setShownProductId] = useState(productId);

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    fetchProductReviews(productId)
      .then((data) => {
        if (cancelled) return;
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        setState({
          status: "success",
          reviews: typeof limit === "number" ? reviews.slice(0, limit) : reviews,
          summary: data.summary || null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          reviews: [],
          summary: null,
          error: error.message || "Reviews could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, limit, attempt]);

  // Live refresh listener. The review form publishes a review and emits an
  // event; if it was for THIS product we relabel as loading and bump `attempt`,
  // which re-runs the fetch effect above. Setting state inside the event
  // listener is an external-system update, so it is safe here.
  useEffect(() => {
    if (!productId) return undefined;
    return onReviewPublished((detail) => {
      const publishedFor = Number(detail?.productId);
      if (!Number.isFinite(publishedFor) || publishedFor === Number(productId)) {
        setState({ status: "loading", reviews: [], summary: null });
        setAttempt((value) => value + 1);
      }
    });
  }, [productId]);

  // Resetting during render (rather than in an effect) means the previous
  // product's reviews are never left on screen under the new product's name.
  if (shownProductId !== productId) {
    setShownProductId(productId);
    setState({ status: "loading", reviews: [], summary: null });
  }

  // The loading flag is set in the click handler, not inside the effect above,
  // so no effect ever writes state synchronously.
  const retry = () => {
    setState({ status: "loading", reviews: [], summary: null });
    setAttempt((value) => value + 1);
  };

  if (!productId) return null;

  return (
    <section className="rv-product" aria-label={`Reviews for ${productName || "this product"}`}>
      <header className="rv-product-head">
        <div className="rv-product-head-text">
          <span className="eyebrow">CUSTOMER REVIEWS</span>
          {state.status === "success" && state.summary?.reviewCount > 0 && (
            <div className="rv-product-score">
              <span className="rv-product-average">
                {Number(state.summary.averageRating).toFixed(1)}
              </span>
              <Stars value={state.summary.averageRating} />
              <span className="rv-product-count">{summaryLine(state.summary)}</span>
            </div>
          )}
          {state.status === "success" && !state.summary?.reviewCount && (
            <p className="rv-product-count">No reviews yet</p>
          )}
        </div>
        <WriteReviewDialog
          label="Write a Review"
          variant="ghost"
          productId={productId}
          productName={productName}
        />
      </header>

      {state.status === "loading" && (
        <p className="rv-state" role="status">
          <Loader2 size={16} className="spin" aria-hidden /> Loading reviews…
        </p>
      )}

      {state.status === "error" && (
        <div className="rv-state rv-state-error" role="alert">
          <p>{state.error}</p>
          <button
            type="button"
            className="rv-link-button"
            onClick={retry}
          >
            <RefreshCw size={13} aria-hidden /> Try again
          </button>
        </div>
      )}

      {state.status === "success" && state.reviews.length === 0 && (
        <div className="rv-empty">
          <MessageSquare size={18} aria-hidden />
          <p>
            No reviews for this piece yet. If you bought it, yours could be the first — it takes
            about a minute.
          </p>
        </div>
      )}

      {state.status === "success" && state.reviews.length > 0 && (
        <div className="rv-product-list">
          {state.reviews.map((review, index) => (
            <ReviewCard
              key={`${review.productId}-${review.createdAt}-${index}`}
              review={review}
              compact
              showProduct={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
