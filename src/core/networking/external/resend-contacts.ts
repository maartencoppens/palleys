import "server-only";
import axios from "axios";
import { env } from "@/core/utils/env";
import { EmailError, resendMessage } from "./email-client";

/*
 * Resend contacts (REST over axios), for keeping the mailing list in Resend. Contacts are global per Resend team and
 * addressed by email; a broadcast goes to a segment's contacts that aren't unsubscribed. Without RESEND_API_KEY the
 * list stays local only (callers check isContactSyncConfigured). Errors are EmailErrors, without addresses in them.
 */

const TIMEOUT_MS = 15_000;
// Resend allows 10 requests a second per team: on a 429, wait what it asks (at most this long) and try again.
const MAX_RETRIES = 2;
const MAX_WAIT_MS = 5_000;

export type ResendContact = { id: string; email: string; unsubscribed: boolean };

export function isContactSyncConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(method: "get" | "post" | "patch", path: string, data?: unknown): Promise<T | null> {
  if (!env.RESEND_API_KEY) throw new EmailError("unknown", "RESEND_API_KEY is not set");
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await axios.request<T>({
        method,
        url: `https://api.resend.com${path}`,
        data,
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "palleys-mailinglist",
        },
      });
      return response.data;
    } catch (error) {
      if (!axios.isAxiosError(error)) throw new EmailError("unknown", null);
      const status = error.response?.status;
      if (status === 404) return null;
      if (status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(error.response?.headers["retry-after"]);
        await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000, MAX_WAIT_MS));
        continue;
      }
      throw new EmailError(status ?? "no response", resendMessage(error.response?.data));
    }
  }
}

const contactPath = (email: string) => `/contacts/${encodeURIComponent(email)}`;

/** The contact with this address, or null when Resend doesn't know it. */
export async function getContact(email: string) {
  return call<ResendContact>("get", contactPath(email));
}

export async function createContact(email: string, { unsubscribed, segmentId }: { unsubscribed: boolean; segmentId?: string }) {
  await call("post", "/contacts", { email, unsubscribed, ...(segmentId && { segments: [{ id: segmentId }] }) });
}

/** `unsubscribed` is global: true keeps the address out of every broadcast. */
export async function setContactUnsubscribed(email: string, unsubscribed: boolean) {
  await call("patch", contactPath(email), { unsubscribed });
}

/** Adds the contact to the segment unless it's already in it. */
export async function ensureContactInSegment(email: string, segmentId: string) {
  const segments = await call<{ data: { id: string }[] }>("get", `${contactPath(email)}/segments?limit=100`);
  if (segments?.data.some((segment) => segment.id === segmentId)) return;
  await call("post", `${contactPath(email)}/segments/${encodeURIComponent(segmentId)}`);
}
