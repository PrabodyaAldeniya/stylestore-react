/* ========================================================
   WRITE A REVIEW — dialog + trigger button
   --------------------------------------------------------
   The single entry point used by the reviews section, the
   product Quick View and My Orders. It owns the modal, the Escape
   key, the body scroll lock and the focus move, so every place
   gets the same accessible behaviour without repeating any of it.

   ITEM MODE: pass `item` (from an order line) to open the form
   already locked to that one product, plus `initialOrderNumber`
   from the same order. The customer only has to confirm the email;
   the server still decides whether the review is allowed.
   ======================================================== */
import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

import WriteReviewForm from "./WriteReviewForm";

export default function WriteReviewDialog({
  label = "Write a Review",
  productId = null,
  productName = null,
  initialOrderNumber = "",
  // Optional `{ productId, productName, variant, imagePath }` for a
  // single, already-known purchase.
  item = null,
  onReviewSubmitted,
  variant = "primary",
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Escape closes, and the page behind the modal must not scroll.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Item mode derives the product id/name from the order line so the two can
  // never disagree with each other.
  const lockedProductId = item ? item.productId : productId;
  const lockedProductName = item ? item.productName : productName;

  return (
    <>
      <button
        type="button"
        className={`rv-write-trigger ${variant} ${className}`.trim()}
        onClick={() => setOpen(true)}
        // data-product lets the caller know which product the review is about.
        data-product-id={lockedProductId ?? undefined}
      >
        <MessageSquarePlus size={16} aria-hidden />
        {label}
      </button>

      {open && (
        <div
          className="modal-overlay rv-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Write a review"
        >
          <div className="rv-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button rv-modal-close"
              onClick={close}
              aria-label="Close the review form"
            >
              <X size={20} />
            </button>
            {lockedProductName && <span className="rv-modal-product">{lockedProductName}</span>}
            <WriteReviewForm
              initialOrderNumber={initialOrderNumber}
              item={item}
              onDone={close}
              onCancel={close}
              onReviewSubmitted={onReviewSubmitted}
            />
          </div>
        </div>
      )}
    </>
  );
}
