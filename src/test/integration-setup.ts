import "dotenv/config";
import { afterAll, beforeAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/db/generated/client";

// Integration tests write to the database. Refuse anything that isn't a local one.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://missing");
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error(`Integration tests only run against a local database, not ${url.hostname}`);
}

// This is the database you develop with, and the tests change or remove the settings row. Each file puts it back afterwards.
// Its own client: the test files disconnect theirs in their afterAll, which runs before this one.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
let savedSettings: string | null = null;

beforeAll(async () => {
  const [row] = await db.$queryRaw<{ saved: string }[]>`SELECT to_jsonb(s)::text AS saved FROM "ShopSettings" s WHERE id = 1`;
  savedSettings = row?.saved ?? null;
});

afterAll(async () => {
  await db.$executeRaw`DELETE FROM "ShopSettings" WHERE id = 1`;
  if (savedSettings) {
    await db.$executeRaw`INSERT INTO "ShopSettings" SELECT * FROM jsonb_populate_record(NULL::"ShopSettings", ${savedSettings}::jsonb)`;
  }
  await db.$disconnect();
});
