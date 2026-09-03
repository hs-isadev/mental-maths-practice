import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@arena/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
      "@arena/questions": fileURLToPath(new URL("./packages/question-engine/src/index.ts", import.meta.url)),
      "@arena/adaptive": fileURLToPath(new URL("./packages/adaptive-engine/src/index.ts", import.meta.url)),
      "@arena/analytics": fileURLToPath(new URL("./packages/analytics/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./apps/web/src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
      include: ["packages/**/*.ts", "apps/web/src/lib/**/*.ts"],
    },
  },
});
