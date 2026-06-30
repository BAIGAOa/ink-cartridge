import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import {
  ScreenSystemContext,
  ScreenSystemContextValue,
} from '../../../src/screen/context.js';
import { useScreenSystem } from '../../../src/screen/hook.js';

function stripAnsi(str: string | undefined): string {
  return (str ?? '').replace(/\x1b\[[0-9;]*m/g, '');
}

const noop = () => {};

const mockContextValue: ScreenSystemContextValue = {
  currentScreen: <Text>hello</Text>,
  currentOverlays: [],
  currentModals: [],
  currentPath: [],
  skip: noop,
  back: noop,
  gotoScreen: noop,
  openOverlay: noop,
  closeOverlay: noop,
  closeAllOverlays: noop,
  activateOverlay: noop,
  deactivateOverlay: noop,
  activeOverlayIds: [],
  displayedOverlays: [],
  displayedModals: [],
  renderedModalEntries: [],
  activeModalId: null,
  activeModal: null,
  modalQueue: [],
  openModal: noop,
  closeModal: noop,
  closeAllModals: noop,
};

describe('useScreenSystem', () => {
  it('returns the context value when called inside a Provider', () => {
    let captured: ScreenSystemContextValue | undefined;

    function TestConsumer({
      onValue,
    }: {
      onValue: (v: ScreenSystemContextValue) => void;
    }) {
      const value = useScreenSystem();
      onValue(value);
      return <Text>consumer</Text>;
    }

    render(
      <ScreenSystemContext.Provider value={mockContextValue}>
        <TestConsumer
          onValue={(v: ScreenSystemContextValue) => {
            captured = v;
          }}
        />
      </ScreenSystemContext.Provider>,
    );

    expect(captured).toBe(mockContextValue);
    expect(captured?.currentScreen).toBe(mockContextValue.currentScreen);
  });

  it('returns nothing when called outside a Provider', () => {
    function TestConsumer({
      onValue,
    }: {
      onValue: (v: ScreenSystemContextValue) => void;
    }) {
      const value = useScreenSystem();
      onValue(value);
      return <Text>consumer</Text>;
    }

    let captured: ScreenSystemContextValue | undefined;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // The hook throws when no Provider is found. React 19 catches the
    // error during render and the consumer's onValue is never called.
    const { lastFrame } = render(<TestConsumer onValue={() => {}} />);

    expect(captured).toBeUndefined();
    expect(stripAnsi(lastFrame()).trim()).toBe('');

    consoleError.mockRestore();
  });
});
