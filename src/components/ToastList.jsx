/* ========================================
   ToastList — stacked slide-in notifications
======================================== */
import { CheckCircle2 } from "lucide-react";

function ToastList({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type || "info"}`}
          role="status"
        >
          <CheckCircle2 size={16} strokeWidth={2.4} aria-hidden="true" />

          <span>{toast.message}</span>

          <button
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastList;