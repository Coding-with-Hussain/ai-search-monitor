import { env, features } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email through Resend's REST API. When RESEND_API_KEY
 * is not configured the message is logged (subject + recipient domain only)
 * and skipped, so development works without an email provider.
 */
/** `skipped`: email is not configured (expected in development) — not a failure to retry. */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean; skipped?: boolean }> {
  if (!features.email()) {
    logger.info("email.skipped_not_configured", { subject: message.subject, toDomain: message.to.split("@")[1] });
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env().RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env().EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.error("email.failed", { status: res.status, subject: message.subject });
      return { sent: false };
    }
    logger.info("email.sent", { subject: message.subject });
    return { sent: true };
  } catch (error) {
    logger.error("email.failed", { error: (error as Error).message, subject: message.subject });
    return { sent: false };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
