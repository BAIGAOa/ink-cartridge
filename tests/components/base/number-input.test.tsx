import { stripAnsi, flush, press } from './_helpers.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { NumberInput } from '../../../src/components/number-input/NumberInput.js';

const KEYS = {
  up: '\x1b[A',
  down: '\x1b[B',
} as const;




function renderNumberInput(props: {
  focusId: string;
  value?: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const onChange = props.onChange ?? vi.fn();

  function HostScreen() {
    return React.createElement(NumberInput, {
      focusId: props.focusId,
      value: props.value ?? 0,
      onChange,
      min: props.min,
      max: props.max,
      step: props.step,
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

  return { lastFrame, lastFrameClean: () => stripAnsi(lastFrame()), stdin, unmount, onChange };
}

beforeEach(() => {
  clearRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NumberInput', () => {
  it('renders initial value', async () => {
    const { lastFrameClean } = renderNumberInput({ focusId: 'num', value: 42 });
    expect(lastFrameClean()).toContain('42');
  });

  it('up arrow increments value', async () => {
    const { stdin, onChange } = renderNumberInput({ focusId: 'num', value: 5 });
    await flush();

    await press(stdin, KEYS.up);
    await flush();

    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('down arrow decrements value', async () => {
    const { stdin, onChange } = renderNumberInput({ focusId: 'num', value: 5 });
    await flush();

    await press(stdin, KEYS.down);
    await flush();

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not go below min', async () => {
    const { stdin, onChange } = renderNumberInput({ focusId: 'num', value: 0, min: 0 });
    await flush();

    await press(stdin, KEYS.down);
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not exceed max', async () => {
    const { stdin, onChange } = renderNumberInput({ focusId: 'num', value: 10, max: 10 });
    await flush();

    await press(stdin, KEYS.up);
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('custom step', async () => {
    const { stdin, onChange } = renderNumberInput({ focusId: 'num', value: 5, step: 3 });
    await flush();

    await press(stdin, KEYS.up);
    await flush();

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('shows cursor when focused', async () => {
    const { lastFrameClean } = renderNumberInput({ focusId: 'num', value: 7 });
    await flush();
    // cursor appears at the end when focused
    expect(lastFrameClean()).toContain('7█');
  });
});
