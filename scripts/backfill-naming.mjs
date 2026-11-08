// Runs the naming backfill (src/db/backfills/naming.ts) against DATABASE_URL, after `prisma migrate deploy`.
//   node scripts/backfill-naming.mjs                     # dry run: shows what would change, changes nothing
//   node scripts/backfill-naming.mjs --apply             # fills in animals, attachments and product codes
//   node scripts/backfill-naming.mjs --apply --renumber-orders   # also gives old orders a PLY number (test data only)
// Idempotent: running it again changes nothing.
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const src = fileURLToPath(new URL("../src", import.meta.url));
const jiti = createJiti(import.meta.url, {
  alias: { "@": src, "server-only": fileURLToPath(new URL("../src/test/empty.ts", import.meta.url)) },
});

const apply = process.argv.includes("--apply");
const renumberOrders = process.argv.includes("--renumber-orders");
const host = new URL(process.env.DATABASE_URL ?? "postgresql://missing").hostname;

const { prisma } = await jiti.import("@/db/client");
const { backfillNaming } = await jiti.import("@/db/backfills/naming");

class DryRun extends Error {}
let report;
try {
  // A dry run does everything inside one transaction and rolls it back.
  await prisma.$transaction(
    async (tx) => {
      report = await backfillNaming(tx, { renumberOrders });
      if (!apply) throw new DryRun();
    },
    { timeout: 120_000 },
  );
} catch (error) {
  if (!(error instanceof DryRun)) throw error;
} finally {
  await prisma.$disconnect();
}

console.log(`${apply ? "Applied" : "Dry run (nothing changed, add --apply)"} on ${host}`);
console.log(JSON.stringify(report, null, 2));
