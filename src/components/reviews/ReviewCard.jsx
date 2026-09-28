/* ========================================================
   REVIEW CARD
   --------------------------------------------------------
   One approved review as a public visitor sees it.

   The backend already reduced the customer's name to a safe
   display format and never sends an email address, an order
   number or a database id, so there is nothing private left to
   strip here — this component only chooses what to show:

     stars · optional title · the message · display name ·
     "Verified Buyer" badge · product name · the date
   ======================================================== */
import { BadgeCheck } from "lucide-react";

import { Stars } from "./StarRating";

/** "2026-09-28T…Z" -> "28 Sep 2026", falling back to an empty string. */
function formatReviewDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsOf(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function ReviewCard({ review, showProduct = true, compact = false }) {
  if (!review) return null;
  const name = review.name || "StyleStore customer";
  const date = formatReviewDate(review.createdAt);

  return (
    <article className={compact ? "rv-card is-compact" : "rv-card"}>
      <div className="rv-card-top">
        <Stars value={review.rating} />
        <span className="rv-sr-only">{review.rating} out of 5 stars</span>
        {date && (
          <time className="rv-card-date" dateTime={String(review.createdAt)}>
            {date}
          </time>
        )}
      </div>

      {review.title && <h3 className="rv-card-title">{review.title}</h3>}

      <blockquote className="rv-card-text">&ldquo;{review.text}&rdquo;</blockquote>

      <div className="rv-card-author">
        <span className="rv-avatar" aria-hidden="true">
          {initialsOf(name)}
        </span>
        <div className="rv-card-author-text">
          <strong>{name}</strong>
          <span className="rv-card-meta">
            {review.verifiedBuyer && (
              <span className="rv-verified">
                <BadgeCheck size={13} aria-hidden /> Verified Buyer
              </span>
            )}
            {showProduct && review.productName && (
              <span className="rv-card-product">{review.productName}</span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

export default ReviewCard;
