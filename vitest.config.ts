import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default to jsdom for backward compatibility with existing tests.
    // New tests under tests/ use node via environmentMatchGlobs.
    // Once all tests are migrated out of src/__tests__/, switch default to 'node'.
    environment: 'jsdom',
    include: [
      'src/__tests__/**/*.test.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
    ],
    globals: true,
    testTimeout: 15_000,
    environmentMatchGlobs: [
      // New tests under tests/ use node environment.
      ['tests/**/*', 'node'],
      // Tests with .ink.test suffix use node (ink-testing-library).
      ['src/__tests__/**/*.ink.test.ts', 'node'],
      ['src/__tests__/**/*.ink.test.tsx', 'node'],
    ],
  },
});
