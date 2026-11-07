import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Each test worker gets its own throwaway database.
    env: { QUEUESMART_DB_PATH: ":memory:" },
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // Backend logic, API routes, and the front-end queue helpers.
      include: ["src/server/**", "src/app/api/**", "src/lib/auth/**", "src/lib/api/**", "src/lib/user-demo.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "src/server/**/index.ts", "src/server/**/types.ts", "src/lib/auth/client-auth.ts"],
    },
  },
});
