/* ========================================================
   STAR RATING
   --------------------------------------------------------
   Two jobs in one component:

   value + onChange -> an interactive 1–5 picker built from real
                       radio inputs, so it is keyboard accessible,
                       screen-reader friendly and never a row of
                       click-only divs.

   value only       -> a read-only display row used on the review
                       cards and the product rating summary.
   ======================================================== */

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

function Stars({ value, max = 5, className = "" }) {
  const rating = Math.round(Number(value) || 0);
  return (
    <span className={`rv-stars ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={index < rating ? "rv-star is-on" : "rv-star"}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

/** Read-only stars with an accessible label such as "4 out of 5 stars". */
function RatingStars({ rating, reviewCount, className = "" }) {
  const value = Number(rating) || 0;
  const text = reviewCount
    ? `${value.toFixed(1)} out of 5 stars from ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
    : "No reviews yet";
  return (
    <span className={`rv-rating ${className}`.trim()}>
      <Stars value={value} />
      <span className="rv-sr-only">{text}</span>
    </span>
  );
}

/** Interactive 1–5 picker. Controlled: `value` plus `onChange(number)`. */
function StarInput({ value, onChange, error, disabled = false, id = "rv-stars" }) {
  const rating = Number(value) || 0;
  return (
    <div className={error ? "rv-star-input has-error" : "rv-star-input"}>
      <div className="rv-star-buttons" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className={star <= rating ? "rv-star-option is-on" : "rv-star-option"}
            title={LABELS[star - 1]}
          >
            <input
              type="radio"
              name={id}
              id={`${id}-${star}`}
              value={star}
              checked={star === rating}
              disabled={disabled}
              onChange={() => onChange(star)}
            />
            <span aria-hidden="true">&#9733;</span>
            <span className="rv-sr-only">
              {star} {star === 1 ? "star" : "stars"} — {LABELS[star - 1]}
            </span>
          </label>
        ))}
      </div>
      <span className="rv-star-input-label" aria-hidden="true">
        {rating ? LABELS[rating - 1] : "Tap a star to rate"}
      </span>
    </div>
  );
}

export { RatingStars, StarInput, Stars };
export default RatingStars;
