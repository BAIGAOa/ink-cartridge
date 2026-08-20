import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'i18n',
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
