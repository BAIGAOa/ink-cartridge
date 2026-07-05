import { stripAnsi, flush, press } from './_helpers.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { SearchInput } from '../../../src/components/search-input/SearchInput.js';

const KEYS = {
  escape: '\x1b',
} as const;




function renderSearchInput(props: {
  focusId: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  onSubmit?: (v: string) => void;
}) {
  const onChange = props.onChange ?? vi.fn();
  const onSubmit = props.onSubmit ?? vi.fn();

  function HostScreen() {
    return React.createElement(SearchInput, {
      focusId: props.focusId,
      value: props.value ?? '',
      onChange,
      placeholder: props.placeholder,
      onSubmit,
    });
  }
  HostScreen.displayName = 'HostScreen';

  clearRegistry();
  registerComponent(HostScreen, {});

  const { lastFrame, stdin, unmount } = render(
    React.createElement(
      ScenarioManagementProvider as any,
      { defaultScreen: HostScreen },
      React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
    ),
  );

  return { lastFrame, lastFrameClean: () => stripAnsi(lastFrame()), stdin, unmount, onChange, onSubmit };
}

beforeEach(() => {
  clearRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchInput', () => {
  it('renders placeholder when value is empty', async () => {
    const { lastFrameClean } = renderSearchInput({
      focusId: 'search',
      value: '',
      placeholder: 'Search...',
    });
    await flush();
    const output = lastFrameClean();
    expect(output).toContain('Search');
  });

  it('shows text and ╳ when value is set', async () => {
    const { lastFrameClean } = renderSearchInput({
      focusId: 'search',
      value: 'hello',
    });
    await flush();
    const output = lastFrameClean();
    expect(output).toContain('hello');
    expect(output).toContain('╳');
  });

  it('Esc clears value', async () => {
    const onChange = vi.fn();
    const { stdin } = renderSearchInput({
      focusId: 'search',
      value: 'hello',
      onChange,
    });
    await flush();

    await press(stdin, KEYS.escape);
    await flush();

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('Esc does not throw when value is empty', async () => {
    const onChange = vi.fn();
    const { stdin } = renderSearchInput({
      focusId: 'search',
      value: '',
      onChange,
    });
    await flush();

    await press(stdin, KEYS.escape);
    await flush();

    expect(onChange).toHaveBeenCalledWith('');
  });
});
