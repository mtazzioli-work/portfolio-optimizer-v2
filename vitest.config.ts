import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environmentMatchGlobs: [["src/lib/insert-at-cursor.test.ts", "jsdom"]],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/profile-chip-seed-data.ts",
        "src/lib/market-data.ts",
        "src/lib/reviews.ts",
        "src/lib/i18n/**",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
