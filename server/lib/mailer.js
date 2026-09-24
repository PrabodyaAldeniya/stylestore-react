// ========================================
// StyleStore welcome-email mailer.
// Gmail is used only from the backend —
// SMTP credentials never leave this process,
// are never sent to the browser and are never
// logged or echoed anywhere.
// ========================================
import {
  createTransporter,
  isSmtpConfigured,
  smtpUser,
  verifyTransporter,
} from "./transporter.js";

export { createTransporter, isSmtpConfigured, verifyTransporter };

const SUBJECT = "Welcome to StyleStore \u2013 Your 10% Discount";
const DISCOUNT_CODE = "WELCOME10";

// StyleStore brand tokens (match src/App.css :root palette).
const BRAND_BG = "#F8F4ED"; // --ivory
const BRAND_CREAM = "#EFE6D8"; // --cream
const BRAND_TEXT = "#18131B"; // --ink
const BRAND_MUTED = "#a79b8a"; // --sand-mid
const BRAND_ACCENT = "#7C3AED"; // --electric
const BRAND_GOLD = "#d9a02a"; // --gold

function buildText() {
  return [
    "Hi there,",
    "",
    "Welcome to StyleStore!",
    "",
    `As a thank you for subscribing, here is your 10% discount code: ${DISCOUNT_CODE}`,
    "",
    "Use it at checkout on your next order.",
    "",
    "Why did you receive this email?",
    "You subscribed to the StyleStore newsletter on our website. This welcome email confirms",
    "your subscription and shares your one-time discount code.",
    "",
    "If you would like to stop receiving updates, reply to this email and let us know. Messages",
    "are currently sent manually from StyleStore, so there is no automatic unsubscribe link yet.",
    "If you did not sign up yourself, you can simply ignore this message.",
    "",
    "The StyleStore Team",
  ].join("\n");
}

function buildHtml() {
  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:24px;background:${BRAND_BG};">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND_CREAM};border-radius:16px;overflow:hidden;">
          <div style="padding:28px 32px 8px;">
            <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND_TEXT};letter-spacing:0.02em;">StyleStore</p>
            <div style="width:44px;height:3px;background:${BRAND_ACCENT};border-radius:2px;"></div>
          </div>

          <div style="padding:20px 32px 8px;">
            <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${BRAND_TEXT};">Welcome to StyleStore!</h1>
            <p style="margin:0;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;">
              Thanks for subscribing. As a thank-you, here is your 10% welcome discount.
            </p>
          </div>

          <div style="margin:24px 32px;padding:18px;border:2px dashed ${BRAND_ACCENT};border-radius:12px;text-align:center;background:${BRAND_BG};">
            <p style="margin:0 0 8px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">
              Your 10% discount code
            </p>
            <p style="margin:0;color:${BRAND_ACCENT};font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;letter-spacing:3px;">${DISCOUNT_CODE}</p>
            <p style="margin:10px 0 0;color:${BRAND_GOLD};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;">Use it at checkout on your next order.</p>
          </div>

          <div style="padding:0 32px;border-top:1px solid ${BRAND_CREAM};">
            <p style="margin:22px 0 6px;color:${BRAND_TEXT};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">
              Why did you receive this email?
            </p>
            <p style="margin:0 0 8px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
              You subscribed to the StyleStore newsletter on our website. This welcome message confirms
              your subscription and shares your one-time discount code.
            </p>
            <p style="margin:0 0 22px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
              To stop receiving updates, reply to this email and let us know. Messages are currently sent
              manually from StyleStore, so there is no automatic unsubscribe link yet. If you did not sign
              up yourself, you can simply ignore this message.
            </p>
            <p style="margin:0 0 26px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;font-size:12px;">
              &copy; StyleStore &middot; The StyleStore Team
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Maps Nodemailer/Node failures to a small set of safe public codes so the
// API can answer with distinct, non-leaking error messages.
function classifySendError(error) {
  const knownCodes = ["SMTP_NOT_CONFIGURED", "SMTP_AUTH_FAILED", "EMAIL_REJECTED"];
  if (knownCodes.includes(error?.code)) return error;

  const upstream = String(error?.code ?? "").toUpperCase();
  if (upstream === "EAUTH") {
    error.code = "SMTP_AUTH_FAILED"; // Google rejected login (bad App Password / 2FA).
  } else if (upstream === "EENVELOPE" || typeof error?.responseCode === "number") {
    error.code = "EMAIL_REJECTED"; // SMTP refused the recipient envelope.
  } else {
    error.code = "INTERNAL_ERROR"; // Connection, DNS, timeout, etc.
  }
  return error;
}

// Sends the real welcome email. Resolves only when the SMTP server accepted
// the message; throws with a safe `code` on any failure.
export async function sendWelcomeEmail(recipient) {
  if (!isSmtpConfigured()) {
    const error = new Error("SMTP credentials are not configured.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail({
      // Sender is always the configured account — visitors can never choose
      // a custom from/replyTo. This keeps the API from becoming an open relay.
      from: `"StyleStore" <${smtpUser()}>`,
      to: recipient,
      subject: SUBJECT,
      text: buildText(),
      html: buildHtml(),
    });

    // Only report success when the SMTP server confirmed acceptance of the
    // intended recipient — never fake success on a failed send.
    if (!Array.isArray(info.accepted) || !info.accepted.includes(recipient)) {
      const error = new Error("SMTP provider did not accept the recipient address.");
      error.code = "EMAIL_REJECTED";
      throw error;
    }

    return true;
  } catch (error) {
    throw classifySendError(error);
  } finally {
    transporter.close();
  }
}