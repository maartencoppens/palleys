import "server-only";
import axios from "axios";
import { env } from "@/core/utils/env";

/*
 * Server-only Resend client (REST over axios). Without RESEND_API_KEY + EMAIL_FROM nothing is sent: callers get
 * `false` back and log that, without the recipient's address. Resend should run in its EU region (GDPR).
 */

const TIMEOUT_MS = 15_000;

export class EmailError extends Error {
  constructor(
    public readonly status: number | "no response" | "unknown",
    /** Resend's own explanation, e.g. that the domain isn't verified. Addresses are stripped: this ends up in logs. */
    public readonly detail: string | null,
  ) {
    super(`Resend request failed (${status})${detail ? `: ${detail}` : ""}`);
  }
}

function resendMessage(data: unknown) {
  const message = (data as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message.replace(/\S+@\S+/g, "[e-mail]").slice(0, 200) : null;
}

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  /** Extra recipients who get a visible copy, e.g. the team Gmail on team mails. */
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  /** Same key = same mail: Resend drops a second send within 24 hours. */
  idempotencyKey: string;
  /** Where "reply" goes, instead of EMAIL_REPLY_TO: e.g. the visitor who wrote to us through the contact form. */
  replyTo?: string;
}): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: env.EMAIL_FROM,
        to: [input.to],
        ...(input.cc?.length && { cc: input.cc }),
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...((input.replyTo ?? env.EMAIL_REPLY_TO) && { reply_to: input.replyTo ?? env.EMAIL_REPLY_TO }),
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
    if (!axios.isAxiosError(error)) throw new EmailError("unknown", null);
    throw new EmailError(error.response?.status ?? "no response", resendMessage(error.response?.data));
  }
}
