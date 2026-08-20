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
        "packages/**",
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
      "./packages/badge",
      "./packages/confirm-dialog",
      "./packages/divider",
      "./packages/fold",
      "./packages/form",
      "./packages/key-hint",
      "./packages/number-input",
      "./packages/progress-bar",
      "./packages/search-bar",
      "./packages/search-input",
      "./packages/select",
      "./packages/spinner",
      "./packages/tabs",
      "./packages/text-input",
      "./packages/i18n",
      "./packages/theme",
      "./packages/event",
    ],
  },
});
