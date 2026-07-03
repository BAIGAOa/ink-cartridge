import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '../../../src/theme/hook.js';

describe('useTheme', () => {
  it('throws when called outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow(/useTheme/);
  });
});
