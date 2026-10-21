import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Backend logic, API routes, and the front-end queue helpers.
      include: ["src/server/**", "src/app/api/**", "src/lib/api/**", "src/lib/user-demo.ts"],
      exclude: ["**/*.test.ts", "src/server/**/index.ts", "src/server/**/types.ts"],
    },
  },
});
