import { describe, it, expect } from 'vitest';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useTheme } from '../../../src/theme/hook.js';

describe('useTheme', () => {
  it('throws when called outside ThemeProvider', () => {
    let error: Error | null = null;
    function TestComponent() {
      try {
        useTheme();
      } catch (e) {
        error = e as Error;
      }
      return <Text>test</Text>;
    }
    render(<TestComponent />);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/useTheme/);
  });
});
