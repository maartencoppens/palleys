"use client";

import { useState } from "react";
import { fetchJournalTsv } from "@/core/modules/finance/api";
import { JOURNAL_TABLE_LABELS } from "@/core/modules/finance/journal";
import { JOURNAL_TABLES, type JournalTable, type PaymentMode } from "@/core/modules/finance/types";
import { getApiErrorMessage } from "@/core/networking/api";
import Button from "@/components/design/Button";

type JournalCopyButtonsProps = { from: string; to: string; mode: PaymentMode };

/** One button per table of the sales journal: copies it as tab-separated text, ready to paste into Excel. */
export function JournalCopyButtons({ from, to, mode }: JournalCopyButtonsProps) {
  const [busy, setBusy] = useState<JournalTable | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function copy(table: JournalTable) {
    setBusy(table);
    setMessage(null);
    try {
      const tsv = await fetchJournalTsv({ from, to, mode, table });
      await navigator.clipboard.writeText(tsv);
      const rows = Math.max(0, tsv.trimEnd().split("\n").length - 1);
      setMessage({ text: `${JOURNAL_TABLE_LABELS[table]} gekopieerd (${rows} ${rows === 1 ? "rij" : "rijen"} + kopregel). Plak in Excel.`, error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error && error.name === "NotAllowedError" ? "Kopiëren werd geweigerd door de browser" : getApiErrorMessage(error), error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {JOURNAL_TABLES.map((table) => (
          <Button key={table} variant="secondary" loading={busy === table} loadingText="Kopiëren…" disabled={busy !== null} onClick={() => copy(table)}>
            Kopieer {JOURNAL_TABLE_LABELS[table].toLowerCase()}
          </Button>
        ))}
      </div>
      <p role="status" className={`text-sm ${message?.error ? "text-[#a3341a]" : "text-text-muted"}`}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
