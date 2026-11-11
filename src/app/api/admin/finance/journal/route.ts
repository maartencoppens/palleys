import { connection, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/core/modules/auth/service";
import { journalFileName, toTsv } from "@/core/modules/finance/journal";
import { getSalesJournal } from "@/core/modules/finance/service";
import { journalQuerySchema } from "@/core/modules/finance/types";
import { InvalidRangeError } from "@/core/modules/finance/utils";

/*
 * The sales journal for a period, to paste into our Excel. Admin only, never cached (customer names and addresses).
 *   ?from=2026-11-01&to=2026-11-30&mode=live            → JSON with the three tables
 *   ...&format=tsv&table=receipts|customers|ledger      → one table as tab-separated text with a header row
 */
export async function GET(request: Request) {
  await connection(); // per request, never prerendered at build time (it needs the admin's session)
  try {
    await requireAdmin();
    const parsed = journalQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: `Controleer ${issue.path.join(".") || "de parameters"}` }, { status: 400 });
    }
    const query = parsed.data;
    if (query.format === "tsv" && !query.table) {
      return NextResponse.json({ error: "Kies een tabel: table=receipts, customers of ledger" }, { status: 400 });
    }

    const journal = await getSalesJournal(query);
    if (query.format === "json") return NextResponse.json(journal, { headers: { "Cache-Control": "no-store" } });

    const table = query.table!;
    return new Response(toTsv(journal[table]), {
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": `inline; filename="${journalFileName(table, journal.from, journal.to)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof InvalidRangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
