/* ========================================================
   WRITE A REVIEW — dialog + trigger button
   --------------------------------------------------------
   The single entry point used by the reviews section and the
   product Quick View. It owns the modal, the Escape key, the
   body scroll lock and the focus move, so both places get the
   same accessible behaviour without repeating any of it.
   ======================================================== */
import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

import WriteReviewForm from "./WriteReviewForm";

export default function WriteReviewDialog({
  label = "Write a Review",
  productId = null,
  productName = null,
  initialOrderNumber = "",
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

  return (
    <>
      <button
        type="button"
        className={`rv-write-trigger ${variant} ${className}`.trim()}
        onClick={() => setOpen(true)}
        // data-product lets the caller know which product the review is about.
        data-product-id={productId ?? undefined}
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
            {productName && <span className="rv-modal-product">{productName}</span>}
            <WriteReviewForm
              initialOrderNumber={initialOrderNumber}
              onDone={close}
              onCancel={close}
            />
          </div>
        </div>
      )}
    </>
  );
}
