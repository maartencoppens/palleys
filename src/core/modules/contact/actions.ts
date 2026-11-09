"use server";

import { headers } from "next/headers";
import { assertRateLimit, RateLimitError } from "@/core/utils/rate-limit";
import { contactSchema, type ContactCode, type ContactState } from "./types";
import { deliverContactMessage } from "./service";

const read = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/** Which text explains what's wrong with the form, from the schema's first complaint. */
function errorCode(values: ContactState["values"] & object): ContactCode {
  if (!values.name || !values.email || !values.message) return "missing";
  const fields = contactSchema.safeParse(values).error?.issues.map((issue) => issue.path[0]) ?? [];
  if (fields.includes("email")) return "invalidEmail";
  return "tooLong";
}

// The contact form (server action): check, rate limit per IP, mail it to us. Next.js refuses actions from other sites.
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = { name: read(formData, "name"), email: read(formData, "email"), message: read(formData, "message") };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { status: "error", code: errorCode(values), values };

  try {
    await assertRateLimit("contact", await headers());
  } catch (error) {
    if (error instanceof RateLimitError) return { status: "error", code: "rateLimited", values };
    throw error;
  }
  if (!(await deliverContactMessage(parsed.data))) return { status: "error", code: "failed", values };
  return { status: "success", code: "sent" };
}
