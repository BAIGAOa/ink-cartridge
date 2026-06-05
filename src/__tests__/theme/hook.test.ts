import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '../../theme/hook.js';

describe('useTheme', () => {
  it('在无 ThemeProvider 时抛出明确错误', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow(/useTheme/);
  });
});
