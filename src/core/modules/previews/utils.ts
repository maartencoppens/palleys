import { UNPAID_UPLOAD_TTL_MS } from "@/data/retention";

export function unpaidExpiry(from: number = Date.now()) {
  return new Date(from + UNPAID_UPLOAD_TTL_MS);
}
