import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import type { Key } from 'ink';

import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import { useScreenSystem } from '../../screen/hook.js';
import { DevScreen } from '../../dev/dev-screen.js';
import GlobalSequenceDisplayBox from '../../dev/globalSeq-display.js';
import { openDevTool } from '../../dev/entrance.js';

// ---- Mock useInput ----

let capturedInputHandler: ((input: string, key: Key) => void) | null = null;

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  return {
    ...actual,
    useInput: (handler: (input: string, key: Key) => void) => {
      capturedInputHandler = handler;
    },
  };
});

function defaultKey(): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, pageDown: false, pageUp: false,
    home: false, end: false,
    ctrl: false, shift: false, meta: false,
  };
}

function pressKey(input: string, overrides: Partial<Key> = {}) {
  capturedInputHandler!(input, { ...defaultKey(), ...overrides } as Key);
}

// ---- Test helpers ----

let screenSystemRef: ReturnType<typeof useScreenSystem> | null = null;

function Spy() {
  const sc = useScreenSystem();
  screenSystemRef = sc;
  return <CurrentScreen />;
}

function renderApp(defaultScreen: React.ComponentType<any>) {
  screenSystemRef = null;
  render(
    <ScenarioManagementProvider defaultScreen={defaultScreen}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );
}

beforeEach(() => {
  capturedInputHandler = null;
  screenSystemRef = null;
  clearRegistry();
  registerComponent(DevScreen, { top: 0, left: 0 });
  registerComponent(GlobalSequenceDisplayBox, { top: 0, left: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Tests ----

describe('GlobalSequenceDisplayBox — Ctrl+S opens the inspector', () => {
  it('opens GlobalSequence inspector modal via Ctrl+S', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    // Open DevScreen
    act(() => pressKey('d', {}));
    expect(screenSystemRef!.activeModalId).toBe('_Dev-Tool_');

    // Press Ctrl+S to open global sequences inspector
    act(() => pressKey('s', { ctrl: true }));
    expect(screenSystemRef!.modalQueue.length).toBeGreaterThanOrEqual(2);
    const modalIds = screenSystemRef!.modalQueue.map(m => m.id);
    expect(modalIds).toContain('__globalSeq-display__');
  });

  it('displays empty state when no global sequences registered', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('d', {}));
    // Opening Ctrl+S should not throw even with zero sequences
    expect(() => act(() => pressKey('s', { ctrl: true }))).not.toThrow();
    expect(screenSystemRef!.modalQueue.map(m => m.id)).toContain('__globalSeq-display__');
  });
});

describe('GlobalSequenceDisplayBox — Escape closes the inspector', () => {
  it('closes via Escape and returns to DevScreen', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('d', {}));
    act(() => pressKey('s', { ctrl: true }));
    expect(screenSystemRef!.modalQueue.map(m => m.id)).toContain('__globalSeq-display__');

    // The global sequences inspector modal is now active — Escape closes it
    act(() => pressKey('', { escape: true }));
    expect(screenSystemRef!.modalQueue.map(m => m.id)).not.toContain('__globalSeq-display__');
    // DevScreen should still be in the modal queue
    expect(screenSystemRef!.modalQueue.map(m => m.id)).toContain('_Dev-Tool_');
  });
});

describe('GlobalSequenceDisplayBox — arrow movement', () => {
  it('up and down arrows do not throw', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('d', {}));
    act(() => pressKey('s', { ctrl: true }));

    // Arrow keys on the inspector panel — should not throw
    expect(() => act(() => pressKey('', { upArrow: true }))).not.toThrow();
    expect(() => act(() => pressKey('', { downArrow: true }))).not.toThrow();
  });
});
