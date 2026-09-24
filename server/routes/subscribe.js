import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import pool from "../db.js";
import { sendWelcomeEmail } from "../lib/mailer.js";

const router = Router();

// Client-side-style validation that also runs on the server.
// Anything that does not look like a normal address is rejected.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Safety valve: 20 sign-ups per IP every 15 minutes. A welcome email is sent
// per new submission, so this also protects the Gmail sending quota.
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many subscription attempts. Please try again later.",
  },
});

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length > MAX_EMAIL_LENGTH ? "" : email;
}

// For development logs only — never a full customer address.
function maskEmail(email) {
  const at = email.indexOf("@");
  if (at <= 1) return "***@***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

router.post("/subscribe", subscribeLimiter, async (req, res) => {
  const { email: rawEmail, consent, website: honeypot } = req.body ?? {};

  // Hidden honeypot field that bots fill in. Acknowledge the bot without
  // touching the email pipeline or claiming a real email was sent.
  if (honeypot) {
    return res.status(200).json({ success: true, message: "Request acknowledged." });
  }

  const email = normalizeEmail(rawEmail);
  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "Please enter a valid email address.",
    });
  }

  // GDPR-style consent: the checkbox must be ticked before we send anything.
  if (consent !== true) {
    return res.status(400).json({
      success: false,
      code: "CONSENT_REQUIRED",
      message: "Please agree to receive StyleStore emails.",
    });
  }

  const logRecipient = maskEmail(email);

  // ---- Save the subscriber (idempotent, duplicate-safe). ----
  // The UNIQUE KEY on subscribers.email plus the ER_DUP_ENTRY catch makes
  // this race-proof: a second identical request inside the same millisecond
  // cannot create two rows.
  let created;
  try {
    const [result] = await pool.execute(
      "INSERT INTO subscribers (email, consent) VALUES (?, 1)",
      [email]
    );
    created = result.affectedRows > 0;
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      // Already subscribed — friendly success, no second welcome email.
      console.info(`[subscribe] already subscribed ${logRecipient}`);
      return res.status(200).json({
        success: true,
        message:
          "You're already on our list — thanks for subscribing! Your welcome code still applies at checkout.",
      });
    }
    console.error(`[subscribe] database save failed for ${logRecipient}:`, error?.message ?? "unknown");
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "We couldn't save your subscription right now. Please try again.",
    });
  }

  if (!created) {
    // Defensive: nothing inserted (shouldn't happen after the dup catch).
    return res.status(200).json({
      success: true,
      message:
        "You're already on our list — thanks for subscribing! Your welcome code still applies at checkout.",
    });
  }

  // ---- Brand new subscriber: send the welcome email. ----
  try {
    // Resolves only when the SMTP server accepted the welcome email.
    await sendWelcomeEmail(email);
  } catch (error) {
    // The subscriber row is already saved. Roll it back (best-effort) so the
    // visitor can retry and still receive their welcome email — otherwise
    // a retry would look "already subscribed" without ever getting the email.
    try {
      await pool.execute("DELETE FROM subscribers WHERE email = ?", [email]);
    } catch (deleteError) {
      console.error(
        `[subscribe] rollback delete failed for ${logRecipient}:`,
        deleteError?.message ?? "unknown"
      );
    }

    const code = error?.code ?? "INTERNAL_ERROR";
    console.error(`[subscribe] send failed (${code}) for ${logRecipient}`);

    switch (code) {
      case "SMTP_NOT_CONFIGURED":
        return res.status(503).json({
          success: false,
          code: "SMTP_NOT_CONFIGURED",
          message: "The email service has not been configured yet.",
        });
      case "SMTP_AUTH_FAILED":
        return res.status(503).json({
          success: false,
          code: "SMTP_AUTH_FAILED",
          message: "The email service is not authenticated correctly. Please try again later.",
        });
      case "EMAIL_REJECTED":
        return res.status(502).json({
          success: false,
          code: "EMAIL_REJECTED",
          message: "The email provider rejected this address. Please try again.",
        });
      default:
        return res.status(502).json({
          success: false,
          code: "EMAIL_SEND_ERROR",
          message: "We couldn't send your welcome email right now. Please try again.",
        });
    }
  }

  console.info(`[subscribe] welcome email accepted for ${logRecipient}`);
  return res.status(200).json({
    success: true,
    message: "Welcome email sent! Please check your inbox or spam folder.",
  });
});

export default router;