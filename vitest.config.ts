import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root("."),
      "server-only": root("tests/server-only-stub.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"], fileParallelism: false, testTimeout: 30_000 },
});
