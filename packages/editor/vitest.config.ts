import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'blots-editor',
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
    coverage: {
      exclude: [
        'dist/**',
        'tests/**/_helpers.*',
        'tests/**/_helpers/**',
        'src/index.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 90,
        statements: 88,
      },
    },
  },
});
