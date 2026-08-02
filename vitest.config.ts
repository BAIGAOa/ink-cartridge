import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 15_000,
    coverage: {
      exclude: [
        "**/dist/**",
        "tests/**/_helpers.*",
        "tests/**/_helpers/**",
        "src/**/index.ts",
      ],
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 90,
        statements: 88,
      },
    },
    projects: [
      {
        test: {
          name: "ink-cartridge",
          include: ["tests/**/*.test.{ts,tsx}"],
        },
      },
      "./src/keyboard-engine",
      "./packages/editor",
    ],
  },
});
