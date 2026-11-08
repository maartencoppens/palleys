import "server-only";
import type { prisma } from "@/db/client";

export type CounterClient = Pick<typeof prisma, "$queryRaw">;

/**
 * Next value of a counter in the Counter table, starting at `start`. Call inside the transaction of what it numbers:
 * the row-locking upsert makes concurrent transactions wait, and a rollback leaves no gap. Never max() + 1.
 */
export async function nextCounterValue(tx: CounterClient, key: string, start = 1) {
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "Counter" ("key", "last") VALUES (${key}, ${start})
    ON CONFLICT ("key") DO UPDATE SET "last" = "Counter"."last" + 1
    RETURNING "last"`;
  return row.last;
}
