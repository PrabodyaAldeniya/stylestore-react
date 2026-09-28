/* ========================================================
   PERMANENT DELETE CONFIRMATION
   --------------------------------------------------------
   The only place in StyleStore where data really disappears,
   so it is deliberately hard to trigger by accident:

     1. it can only be opened from the Trash,
     2. it spells out exactly what is destroyed and what is
        not (past orders are never touched),
     3. it will not act until the word DELETE is typed.

   The server repeats all three checks independently.
   ======================================================== */
import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";

const CONFIRMATION_WORD = "DELETE";

export default function PermanentDeleteDialog({
  product,
  onClose,
  onConfirm,
  busy = false,
  error = "",
}) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);

  // Focus the confirmation box as soon as the dialog opens so the second
  // step is obvious and keyboard users land in the right place.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const matches = typed.trim().toUpperCase() === CONFIRMATION_WORD;

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="adm-danger"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="adm-danger-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button adm-preview-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Cancel permanent delete"
        >
          <X size={20} />
        </button>

        <div className="adm-danger-head">
          <span className="adm-danger-icon" aria-hidden>
            <ShieldAlert size={22} />
          </span>
          <div>
            <h2 id="adm-danger-title">Permanently delete this product?</h2>
            <p className="adm-danger-name">{product?.name}</p>
          </div>
        </div>

        <div className="adm-danger-body">
          <p className="adm-danger-warning">
            <strong>This cannot be undone.</strong> There is no Trash to restore
            from and no undo button afterwards.
          </p>
          <ul className="adm-danger-list">
            <li>The product is removed from the database for good.</li>
            <li>
              Its uploaded photos, sizes and colours are removed as well.
            </li>
            <li>
              It disappears from your product list, the shop and the search.
            </li>
            <li className="is-safe">
              Past orders are <strong>not</strong> affected — every order keeps
              its own saved product name, SKU, price, size, colour and photo.
            </li>
          </ul>
          <p className="adm-danger-hint">
            Not sure yet? Close this box and use <strong>Restore</strong> instead —
            the product returns exactly as it was.
          </p>
        </div>

        <label className="adm-danger-confirm" htmlFor="adm-danger-input">
          <span>
            Type <code>{CONFIRMATION_WORD}</code> to confirm
          </span>
          <input
            id="adm-danger-input"
            ref={inputRef}
            type="text"
            value={typed}
            autoComplete="off"
            spellCheck="false"
            disabled={busy}
            placeholder={CONFIRMATION_WORD}
            aria-describedby="adm-danger-error"
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>

        {error && (
          <p className="admin-form-error" id="adm-danger-error" role="alert">
            {error}
          </p>
        )}

        <div className="adm-danger-actions">
          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Keep it in the Trash
          </button>
          <button
            type="button"
            className="adm-button adm-button-danger-solid"
            onClick={() => onConfirm(CONFIRMATION_WORD)}
            disabled={busy || !matches}
          >
            {busy ? (
              <Loader2 className="spin" size={16} aria-hidden />
            ) : (
              <TrashIcon />
            )}
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
