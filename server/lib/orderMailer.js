// ========================================
// StyleStore order confirmation email.
// Reuses the existing Gmail/Nodemailer setup.
// Sending is ALWAYS best-effort: an order is
// never failed because an email could not be sent.
// ========================================
import { createTransporter, isSmtpConfigured, smtpUser } from "./transporter.js";

const BRAND_BG = "#F8F4ED";
const BRAND_CREAM = "#EFE6D8";
const BRAND_TEXT = "#18131B";
const BRAND_MUTED = "#a79b8a";
const BRAND_ACCENT = "#7C3AED";
const BRAND_GOLD = "#d9a02a";

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  bank_deposit: "Bank Deposit",
};

const BANK_INSTRUCTIONS =
  "Kindly settle your order via bank deposit within 24 hours.\n" +
  "Account name: StyleStore Retail (Pvt) Ltd\n" +
  "Bank: Commercial Bank of Ceylon\n" +
  "Account number: 1200 1234 5678\n" +
  "Reference: use your order number\n" +
  "After depositing, send a screenshot and your order number to +94 77 000 0000 (WhatsApp).";

function money(value) {
  return "Rs. " + Math.round(value).toLocaleString("en-LK");
}

function buildText(order) {
  const lines = [
    `Hi ${order.firstName},`,
    "",
    `Thank you for shopping at StyleStore. Your order ${order.orderNumber} has been received.`,
    "",
    "— WHAT YOU ORDERED —",
  ];

  for (const item of order.items) {
    const variant = item.size ? ` (Size ${item.size})` : "";
    lines.push(`  ${item.quantity} x ${item.productName}${variant} — ${money(item.lineTotal)}`);
  }

  lines.push("", "— ORDER SUMMARY —");
  lines.push(`  Subtotal:        ${money(order.subtotal)}`);
  if (order.discount > 0) {
    lines.push(`  Discount (${order.discountCode}): -${money(order.discount)}`);
  }
  lines.push(`  Delivery:        ${order.shipping === 0 ? "Free" : money(order.shipping)}`);
  lines.push(`  TOTAL:           ${money(order.total)}`);

  lines.push("", "— PAYMENT METHOD —", `  ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}`);

  if (order.paymentMethod === "bank_deposit") {
    lines.push("", "Bank deposit instructions:", BANK_INSTRUCTIONS);
  } else {
    lines.push(
      "",
      "Please have the exact amount ready in cash when our delivery partner arrives."
    );
  }

  lines.push(
    "",
    `Estimated delivery: ${order.deliveryLabel}.`,
    "If you have any questions, reply to this email or contact us on +94 77 000 0000.",
    "",
    "The StyleStore Team"
  );

  return lines.join("\n");
}

function buildHtml(order) {
  const rows = order.items
    .map(
      (item) => `
        <tr style="border-bottom:1px solid ${BRAND_CREAM};">
          <td style="padding:10px 0;color:${BRAND_TEXT};font-family:Arial,sans-serif;font-size:14px;">
            ${item.quantity} &times; ${item.productName}${item.size ? ` <em>(${item.size})</em>` : ""}
          </td>
          <td style="padding:10px 0;text-align:right;color:${BRAND_TEXT};font-family:Arial,sans-serif;font-size:14px;white-space:nowrap;">
            ${money(item.lineTotal)}
          </td>
        </tr>`
    )
    .join("");

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:24px;background:${BRAND_BG};">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND_CREAM};border-radius:16px;overflow:hidden;">
          <div style="padding:28px 32px 8px;">
            <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND_TEXT};">StyleStore</p>
            <div style="width:44px;height:3px;background:${BRAND_ACCENT};border-radius:2px;"></div>
          </div>

          <div style="padding:20px 32px 8px;">
            <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${BRAND_TEXT};">Order ${order.orderNumber} — confirmed</h1>
            <p style="margin:0;color:${BRAND_MUTED};font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">
              Hi ${order.firstName}, thanks for your order. We'll start preparing it right away.
            </p>
          </div>

          <div style="margin:24px 32px;padding:18px;border:1px solid ${BRAND_CREAM};border-radius:12px;background:${BRAND_BG};">
            <table style="width:100%;border-collapse:collapse;">${rows}</table>
            <table style="width:100%;margin-top:12px;border-collapse:collapse;">
              <tr><td style="color:${BRAND_MUTED};padding:4px 0;font-size:14px;">Subtotal</td>
                  <td style="text-align:right;padding:4px 0;font-size:14px;">${money(order.subtotal)}</td></tr>
              ${
                order.discount > 0
                  ? `<tr><td style="color:${BRAND_MUTED};padding:4px 0;font-size:14px;">Discount (${order.discountCode})</td>
                      <td style="text-align:right;padding:4px 0;font-size:14px;color:#23a55a;">-${money(order.discount)}</td></tr>`
                  : ""
              }
              <tr><td style="color:${BRAND_MUTED};padding:4px 0;font-size:14px;">Delivery</td>
                  <td style="text-align:right;padding:4px 0;font-size:14px;">${order.shipping === 0 ? "Free" : money(order.shipping)}</td></tr>
              <tr>
                <td style="padding:10px 0 0;font-family:Georgia,serif;font-size:18px;color:${BRAND_TEXT};"><strong>Total</strong></td>
                <td style="padding:10px 0 0;text-align:right;font-family:Georgia,serif;font-size:20px;color:${BRAND_TEXT};"><strong>${money(order.total)}</strong></td>
              </tr>
            </table>
          </div>

          <div style="margin:0 32px 24px;padding:18px;border:2px dashed ${BRAND_ACCENT};border-radius:12px;text-align:center;background:${BRAND_BG};">
            <p style="margin:0 0 8px;color:${BRAND_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">
              Payment method
            </p>
            <p style="margin:0;color:${BRAND_ACCENT};font-family:Georgia,serif;font-size:20px;font-weight:bold;">${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</p>
            <p style="margin:10px 0 0;color:${BRAND_GOLD};font-family:Arial,sans-serif;font-size:13px;font-weight:600;">
              ${order.paymentMethod === "bank_deposit" ? money(order.total) + " due by bank deposit within 24 hours." : "Please have the exact amount ready in cash."}
            </p>
          </div>

          ${
            order.paymentMethod === "bank_deposit"
              ? `<div style="padding:0 32px;border-top:1px solid ${BRAND_CREAM};">
                  <p style="margin:20px 0 6px;color:${BRAND_TEXT};font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Bank deposit details</p>
                  <pre style="margin:0 0 20px;color:${BRAND_MUTED};font-family:Arial,sans-serif;font-size:13px;line-height:1.7;white-space:pre-wrap;">${BANK_INSTRUCTIONS}</pre>
                </div>`
              : ""
          }

          <div style="padding:0 32px;border-top:1px solid ${BRAND_CREAM};">
            <p style="margin:20px 0 26px;color:${BRAND_MUTED};font-family:Arial,sans-serif;font-size:13px;line-height:1.6;">
              Delivery method: <strong>${order.deliveryLabel}</strong> &middot; Questions? Reply to this email or call +94 77 000 0000.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Best-effort confirmation email. Throws with a safe `code` on failure;
// callers must catch and log — never fail the order itself.
export async function sendOrderEmail(recipient, order) {
  if (!isSmtpConfigured()) {
    const error = new Error("SMTP credentials are not configured.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"StyleStore" <${smtpUser()}>`,
      to: recipient,
      subject: `Your StyleStore order ${order.orderNumber} is confirmed`,
      text: buildText(order),
      html: buildHtml(order),
    });
    return true;
  } finally {
    transporter.close();
  }
}