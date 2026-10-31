import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests against the LOCAL database (docker-compose.dev.yml). External APIs are mocked per test.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./src/test/integration-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
