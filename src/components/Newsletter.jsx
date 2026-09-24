/* ========================================
   NEWSLETTER — welcome-email subscription
   Sends email + consent to the Express
   backend, which delivers a welcome email
   via Gmail/Nodemailer.
======================================== */
import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_EMAIL = "Please enter a valid email address.";
const CONSENT_ERROR = "Please agree to receive StyleStore emails.";
const UNREACHABLE_MSG =
  "The email service is currently unavailable. Please try again shortly.";
const NOT_CONFIGURED_MSG = "The email service has not been configured yet.";
const SEND_FAILED_MSG =
  "We couldn't send your welcome email right now. Please try again.";
const SUCCESS_MSG =
  "Welcome email sent! Please check your inbox or spam folder.";

// Maps the backend's safe error codes to the messages visitors should see.
const MESSAGE_BY_CODE = {
  INVALID_EMAIL: INVALID_EMAIL,
  CONSENT_REQUIRED: CONSENT_ERROR,
  SMTP_NOT_CONFIGURED: NOT_CONFIGURED_MSG,
  SMTP_AUTH_FAILED: SEND_FAILED_MSG,
  EMAIL_REJECTED: SEND_FAILED_MSG,
  EMAIL_SEND_ERROR: SEND_FAILED_MSG,
  INTERNAL_ERROR: SEND_FAILED_MSG,
  RATE_LIMITED: "Too many subscription attempts. Please try again later.",
};

// Development logs only — never print full customer addresses.
function maskEmailForLog(email) {
  const at = email.indexOf("@");
  if (at <= 1) return "***@***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [fieldError, setFieldError] = useState("");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [highlighted, setHighlighted] = useState(false);

  const inputRef = useRef(null);
  const consentRef = useRef(null);
  const highlightTimer = useRef(null);

  // The footer "Sign Up" CTA scrolls to this section, then fires this event
  // so we focus the email field and briefly highlight the card.
  useEffect(() => {
    const handleFocusRequest = () => {
      setHighlighted(true);
      inputRef.current?.focus({ preventScroll: true });
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlighted(false), 2600);
    };
    window.addEventListener("stylestore:focus-newsletter", handleFocusRequest);
    return () => {
      window.removeEventListener("stylestore:focus-newsletter", handleFocusRequest);
      window.clearTimeout(highlightTimer.current);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Prevent duplicate submissions while a request is in flight.
    if (status === "submitting") return;

    setFieldError("");
    setServerError("");

    // Hidden honeypot filled in by a bot — silently ignore it. A real
    // user never sees this field.
    if (honeypot) return;

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError(INVALID_EMAIL);
      inputRef.current?.focus();
      return;
    }
    if (!consent) {
      setFieldError(CONSENT_ERROR);
      consentRef.current?.focus();
      return;
    }

    setStatus("submitting");
    setSuccessMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, consent, website: honeypot }),
      });

      if (!response.ok) {
        // Never let a non-JSON or empty body crash the UI.
        let data = {};
        let failedToParse = false;
        try {
          data = await response.json();
        } catch {
          data = {};
          failedToParse = true;
        }
        const code = data?.code;
        const backendMessage = data?.message || data?.error || "";
        if (failedToParse) {
          console.debug("[newsletter] backend returned a non-JSON error response");
        } else {
          console.debug(
            `[newsletter] subscription rejected status=${response.status} code=${code || "unknown"}`
          );
        }
        setServerError(
          (code && MESSAGE_BY_CODE[code]) || backendMessage || SEND_FAILED_MSG
        );
        setStatus("error");
        return;
      }

      // Real send confirmed by the backend — only then clear the form.
      // (For an already-subscribed address the backend also returns a
      // friendly success message, which we display instead of the default.)
      console.debug(
        `[newsletter] welcome email accepted for ${maskEmailForLog(trimmed)}`
      );
      let successMessage = SUCCESS_MSG;
      try {
        const data = await response.json();
        if (data?.message) successMessage = data.message;
      } catch {
        // Non-JSON success body — keep the default message.
      }
      setSuccessMessage(successMessage);
      setEmail("");
      setConsent(false);
      setStatus("success");
    } catch {
      // Backend refused the connection / network failure.
      console.debug("[newsletter] email service unreachable");
      setServerError(UNREACHABLE_MSG);
      setStatus("error");
    }
  };

  return (
    <section className="newsletter" id="newsletter">
      <div className="newsletter-inner">
        <div className={"newsletter-box reveal" + (highlighted ? " highlighted" : "")}>
          <span className="eyebrow">STAY IN THE LOOP</span>
          <h2>10% off your first order</h2>
          <p>
            Subscribe for new arrivals, private sales and editor styling
            notes. No spam, ever.
          </p>

          <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
            {/* Honeypot — invisible to humans, irresistible to bots. */}
            <label className="sr-only newsletter-honeypot" htmlFor="newsletter-website">
              Leave this field empty
            </label>
            <input
              className="newsletter-honeypot"
              id="newsletter-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />

            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input
              ref={inputRef}
              id="newsletter-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              disabled={status === "submitting"}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "newsletter-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldError) setFieldError("");
                if (status === "error" || status === "success") setStatus("idle");
              }}
            />

            <button type="submit" className="primary-button" disabled={status === "submitting"}>
              {status === "submitting" ? (
                <>Subscribing&hellip;</>
              ) : (
                <>
                  <Mail size={15} aria-hidden="true" /> Subscribe
                </>
              )}
            </button>

            <label className="newsletter-consent">
              <input
                ref={consentRef}
                type="checkbox"
                checked={consent}
                disabled={status === "submitting"}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (fieldError === CONSENT_ERROR) setFieldError("");
                }}
              />
              <span className="newsletter-consent-text">
                I agree to receive StyleStore marketing emails. I can unsubscribe at any time.
              </span>
            </label>

            {fieldError && (
              <p id="newsletter-email-error" className="newsletter-msg err" role="alert">
                {fieldError}
              </p>
            )}

            <div className="newsletter-aria" aria-live="polite">
              {status === "success" && (
                <p className="newsletter-msg ok" role="status">
                  {successMessage}
                </p>
              )}
              {status === "error" && (
                <p className="newsletter-msg err" role="alert">
                  {serverError}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Newsletter;