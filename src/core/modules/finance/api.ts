import { api } from "@/core/networking/api";
import type { JournalTable, PaymentMode } from "./types";

/** One table of the sales journal as tab-separated text, ready for the clipboard. */
export async function fetchJournalTsv(input: { from: string; to: string; mode: PaymentMode; table: JournalTable }) {
  const { data } = await api.get<string>("/admin/finance/journal", {
    params: { ...input, format: "tsv" },
    responseType: "text",
    transformResponse: (body) => body, // keep the text as it is, no JSON parsing
  });
  return data;
}
