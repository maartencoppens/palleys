import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/db/schema.prisma",
  migrations: { path: "src/db/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
