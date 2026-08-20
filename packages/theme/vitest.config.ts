import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'theme',
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
