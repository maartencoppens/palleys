import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { env } from "@/core/utils/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Remove sslmode from the URL so it can't override our explicit ssl settings.
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete("sslmode");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    max: 5,
    ssl: {
      ca: readFileSync(path.join(process.cwd(), "certs/aiven-ca.pem"), "utf8"),
      rejectUnauthorized: true,
    },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { PreviewStatus } from "./generated/client";
