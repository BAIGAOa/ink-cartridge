import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
    testTimeout: 15_000,
    coverage: {
      exclude: [
        'tests/**/_helpers.*',
        'tests/**/_helpers/**',
        'src/**/index.ts',
        // Dev-tool inspectors need full keyboard-layer state to render detail
        // cards — cost/benefit of mocking that state isn't worth it for
        // non-production debugging UIs.
        'src/dev/**',
      ],
      thresholds: {
        lines: 90,
        branches: 88,
        functions: 90,
        statements: 88,
      },
    },
  },
});
