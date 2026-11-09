import { z } from "zod";
import { safeText } from "@/core/modules/checkout/types";
import { FIELD_LIMITS } from "@/data/checkout";
import { CONTACT_LIMITS } from "@/data/contact";

export const contactSchema = z.object({
  name: safeText(CONTACT_LIMITS.name),
  email: z.string().trim().toLowerCase().pipe(z.email().max(FIELD_LIMITS.email)),
  message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
});
export type ContactInput = z.infer<typeof contactSchema>;

/** Which text the form shows, in the visitor's language (contact in core/locale/messages). */
export type ContactCode = "missing" | "invalidEmail" | "tooLong" | "rateLimited" | "failed" | "sent";

export type ContactState = {
  status: "idle" | "success" | "error";
  code?: ContactCode;
  /** Values echoed back on error, so the visitor doesn't lose what they typed. */
  values?: { name: string; email: string; message: string };
};
