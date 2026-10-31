import "server-only";
import axios from "axios";
import { env } from "@/core/utils/env";

/*
 * Server-only Resend client (REST over axios). Without RESEND_API_KEY + EMAIL_FROM nothing is sent: callers get
 * `false` back and log that, without the recipient's address. Resend should run in its EU region (GDPR).
 */

const TIMEOUT_MS = 15_000;

export class EmailError extends Error {}

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Same key = same mail: Resend drops a second send within 24 hours. */
  idempotencyKey: string;
}): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(env.EMAIL_REPLY_TO && { reply_to: env.EMAIL_REPLY_TO }),
      },
      {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
      },
    );
    return true;
  } catch (error) {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? "no response") : "unknown";
    throw new EmailError(`Resend request failed (${status})`);
  }
}
