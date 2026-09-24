// ========================================
// Gmail SMTP transport for Nodemailer.
// Secrets come from environment variables
// and are never logged or echoed.
// ========================================
import nodemailer from "nodemailer";

// Reads SMTP_USER, trimming incidental whitespace (a stray leading space in
// .env would otherwise make Gmail reject the login with EAUTH).
export function smtpUser() {
  return String(process.env.SMTP_USER || "").trim();
}

// True only when both SMTP_USER and SMTP_APP_PASSWORD are present.
export function isSmtpConfigured() {
  return Boolean(smtpUser() && process.env.SMTP_APP_PASSWORD);
}

export function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // implicit TLS
    auth: {
      user: smtpUser(),
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
}

// Opens a real SMTP connection and authenticates with Google.
// Throws with code EMAIL_CONFIG_ERROR if credentials are missing and
// propagates Nodemailer's error if Gmail rejects the login.
export async function verifyTransporter(transporter) {
  if (!isSmtpConfigured()) {
    const error = new Error("SMTP credentials are not configured.");
    error.code = "EMAIL_CONFIG_ERROR";
    throw error;
  }
  await transporter.verify();
}