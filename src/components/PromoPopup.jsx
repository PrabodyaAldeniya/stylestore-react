/* ========================================
   PROMO POPUP — 15% off first order (NEWUSER)
   Appears 4 seconds after first visit, once.
   Uses localStorage so it never shows again
   after being closed. Accessible: dialog role,
   Escape to close, focus management, mobile
   responsive.
   ======================================== */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Copy, X, Check } from "lucide-react";

const PROMO_DELAY_MS = 4000;
const DISMISS_KEY = "styleStorePromoDismissed";
const PROMO_CODE = "NEWUSER";

function PromoPopup() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const closeRef = useRef(null);
  const copyTimer = useRef(null);

  // Only show on the storefront (home) page — never interrupt checkout.
  const visibleRoute = location.pathname === "/";

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable — fine, just close */
    }
  }, []);

  useEffect(() => {
    if (!visibleRoute) return;

    let dismissed;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      // Move focus into the dialog for keyboard users.
      window.setTimeout(() => closeRef.current?.focus(), 60);
    }, PROMO_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [visibleRoute]);

  // Derived visibility: on the storefront AND intentionally opened.
  const visible = visibleRoute && open;

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(copyTimer.current);
    };
  }, [visible, close]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
      setCopied(false);
    }
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2200);
  };

  if (!visible) return null;

  return (
    <div
      className="promo-backdrop"
      onClick={close}
    >
      <div
        className="promo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="icon-button promo-close"
          onClick={close}
          aria-label="Close promotional offer"
        >
          <X size={20} />
        </button>

        <span className="promo-kicker">FIRST ORDER ONLY</span>
        <h2 id="promo-title">15% off your first order</h2>
        <p>
          Welcome to StyleStore — enjoy 15% off the pieces you love. Enter the code at
          checkout.
        </p>

        <div className="promo-code-box">
          <span className="promo-code-label">Your code</span>
          <div className="promo-code-row">
            <strong className="promo-code">{PROMO_CODE}</strong>
            <button
              type="button"
              className={copied ? "promo-copy copied" : "promo-copy"}
              onClick={copyCode}
              aria-live="polite"
            >
              {copied ? (
                <>
                  <Check size={15} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy Code
                </>
              )}
            </button>
          </div>
          {copyFailed && <p className="promo-copy-fail">Press Ctrl+C (Cmd+C) to copy.</p>}
        </div>

        <button type="button" className="promo-cta primary-button" onClick={close}>
          Start Shopping
        </button>
      </div>
    </div>
  );
}

export default PromoPopup;