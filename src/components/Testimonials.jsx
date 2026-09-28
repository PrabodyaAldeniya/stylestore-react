/* ========================================================
   CUSTOMER REVIEWS — the public reviews section
   --------------------------------------------------------
   This used to render three invented customer quotes. It now
   reads GET /api/reviews, which returns APPROVED reviews from
   the database only. A pending or rejected review can never
   appear here, and if there are no approved reviews the section
   says so honestly instead of showing sample customers.

   The heading is deliberately "Loved by our customers" rather
   than "Loved by thousands": the count shown is the real number
   of approved reviews, so the copy can never overstate it.

   This is also where the "Write a Review" button lives.
   ======================================================== */
import { useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";

import { fetchApprovedReviews } from "../lib/reviewApi";
import ReviewCard from "./reviews/ReviewCard";
import WriteReviewDialog from "./reviews/WriteReviewDialog";

const MAX_REVIEWS = 9;

export default function Testimonials() {
  const [state, setState] = useState({ status: "loading", reviews: [] });
  const [attempt, setAttempt] = useState(0);

  // Kept in a useCallback-free effect on purpose: the only state written here
  // happens in the fetch callbacks, which React treats as external-system
  // updates rather than a cascading render.
  useEffect(() => {
    let cancelled = false;
    fetchApprovedReviews({ limit: MAX_REVIEWS })
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "success",
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          reviews: [],
          error: error.message || "Reviews could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // The loading flag is set here, in the click handler, rather than at the top
  // of the effect, so the effect never writes state synchronously.
  const retry = () => {
    setState({ status: "loading", reviews: [] });
    setAttempt((value) => value + 1);
  };

  const { status, reviews } = state;
  const approvedCount = reviews.length;

  return (
    <section className="testimonials" id="reviews">
      <div className="section-heading reveal">
        <span className="eyebrow">PEOPLE WORDS</span>
        <h2>Loved by our customers</h2>
        <p>
          Real reviews from real StyleStore orders, published after our team checks each one.
        </p>
      </div>

      {/* ---- Header actions: honest count + the write-a-review entry point ---- */}
      <div className="rv-section-bar reveal">
        <p className="rv-count" aria-live="polite">
          {status === "success"
            ? approvedCount === 0
              ? "No published reviews yet."
              : `${approvedCount} published review${approvedCount === 1 ? "" : "s"}.`
            : status === "loading"
              ? "Loading customer reviews…"
              : "Customer reviews are unavailable right now."}
        </p>
        <div className="rv-section-actions">
          {status === "error" && (
            <button type="button" className="rv-link-button" onClick={retry}>
              <RefreshCw size={14} aria-hidden /> Try again
            </button>
          )}
          <WriteReviewDialog label="Write a Review" />
        </div>
      </div>

      {status === "loading" && (
        <div className="testimonials-grid reveal" role="status" aria-busy="true">
          <p className="rv-state">
            <Loader2 size={16} className="spin" aria-hidden /> Loading customer reviews…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="testimonials-grid reveal">
          <p className="rv-state rv-state-error" role="alert">
            {state.error}
          </p>
        </div>
      )}

      {status === "success" && reviews.length === 0 && (
        <div className="testimonials-grid reveal">
          <div className="rv-empty rv-empty-wide">
            <MessageSquarePlus size={20} aria-hidden />
            <h3>No published reviews yet</h3>
            <p>
              Once customers review the pieces they have bought and our team approves them, they
              will appear here. If you have ordered from us, we would love to hear from you.
            </p>
            <WriteReviewDialog label="Write the first review" variant="secondary" />
          </div>
        </div>
      )}

      {status === "success" && reviews.length > 0 && (
        <div className="testimonials-grid reveal">
          {reviews.map((review, index) => (
            <ReviewCard
              key={`${review.productId}-${review.createdAt}-${index}`}
              review={review}
            />
          ))}
        </div>
      )}
    </section>
  );
}
