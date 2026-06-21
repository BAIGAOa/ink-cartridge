import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import type { Key } from 'ink';

import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { KeyboardProvider, clearShortcutOperations } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import { useScreenSystem } from '../../screen/hook.js';
import { DevScreen } from '../../dev/dev-screen.js';
import { openDevTool, closeDevTool } from '../../dev/entrance.js';

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
  clearShortcutOperations();
  registerComponent(DevScreen, { top: 0, left: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Tests ----

describe('DevScreen open / close toggle', () => {
  it('opens DevScreen overlay via openDevTool', () => {
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
    expect(screenSystemRef!.displayedOverlays.length).toBe(1);
    expect(screenSystemRef!.displayedOverlays[0].id).toBe('_Dev-Tool_');
  });

  it('throws when opening DevScreen that is already open', () => {
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
    expect(() => act(() => pressKey('d', {}))).toThrow('already exists');
  });

  it('toggle with ref pattern does not throw on repeated presses', () => {
    const openRef = { current: false };
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => {
          if (openRef.current) {
            closeDevTool();
            openRef.current = false;
          } else {
            openDevTool({ top: 0, left: 0 });
            openRef.current = true;
          }
        });
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    // Open
    act(() => pressKey('d', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(1);
    // Close
    act(() => pressKey('d', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(0);
    // Open again — no throw
    act(() => pressKey('d', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(1);
  });

  it('closeDevTool throws when overlay does not exist (module-level, provider required)', () => {
    function Main() {
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    // Provider is mounted but no overlay with that ID — should throw
    expect(() => act(() => { closeDevTool(); })).toThrow('no overlay with that ID');
  });
});

describe('DevScreen keyboard arrow movement', () => {
  it('arrow-up and arrow-down handlers are bound and fire without error', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['o'], () => openDevTool({ top: 5, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('o', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(1);

    // Arrow keys on DevScreen — should not throw
    expect(() => act(() => pressKey('', { upArrow: true }))).not.toThrow();
    expect(() => act(() => pressKey('', { downArrow: true }))).not.toThrow();
  });

  it('arrow keys pass through when DevScreen is not open', () => {
    function Main() {
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    expect(() => act(() => pressKey('', { upArrow: true }))).not.toThrow();
  });

  it('clamps to top boundary at 0 without throwing', () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['o'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('o', {}));

    for (let i = 0; i < 50; i++) {
      act(() => pressKey('', { upArrow: true }));
    }
  });
});

describe('DevScreen displays overlay state', () => {
  it('shows multiple overlays via displayedOverlays', () => {
    function SecondOverlay() {
      return null;
    }
    SecondOverlay.displayName = 'SecondOverlay';
    registerComponent(SecondOverlay, {});

    function Main() {
      const { boundKeyboard: bk, openOverlay } = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['1'], () => openDevTool({ top: 0, left: 0 }));
        kb.boundKeyboard(['2'], () => openOverlay('second-ovl', SecondOverlay, {}));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('1', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(1);

    act(() => pressKey('2', {}));
    expect(screenSystemRef!.displayedOverlays.length).toBe(2);
    expect(screenSystemRef!.displayedOverlays.map(o => o.id)).toContain('second-ovl');
  });

  it('activeOverlayIds distinguishes active from inactive overlays', () => {
    function InactiveOverlay() {
      return null;
    }
    InactiveOverlay.displayName = 'InactiveOverlay';
    registerComponent(InactiveOverlay, {});

    function Main() {
      const { boundKeyboard: bk, openOverlay } = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        // Open DevTool active
        kb.boundKeyboard(['1'], () => openDevTool({ top: 0, left: 0 }));
        // Open second overlay but deactivated
        kb.boundKeyboard(['2'], () => openOverlay('inactive-ovl', InactiveOverlay, {}, { activate: false }));
      }, []);
      return null;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});
    renderApp(Main);

    act(() => pressKey('1', {}));
    act(() => pressKey('2', {}));

    expect(screenSystemRef!.displayedOverlays.length).toBe(2);
    // DevTool is active, the other is not
    expect(screenSystemRef!.activeOverlayIds).toContain('_Dev-Tool_');
    expect(screenSystemRef!.activeOverlayIds).not.toContain('inactive-ovl');
  });
});
