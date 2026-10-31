import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure modules only (no DB, no network). Files importing "server-only" can't run here.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], exclude: ["src/**/*.integration.test.ts", "node_modules/**"], environment: "node" },
});
