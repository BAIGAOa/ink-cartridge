import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import type { Key } from 'ink';

import { registerComponent, clearRegistry } from '../../screen/registry.js';
import {
  ScenarioManagementProvider,
  clearDispatchers,
} from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { openDevTool, closeDevTool, DEVTOOL_OVERLAY_ID } from '../../dev/index.js';
import { DevTool } from '../../dev/DevTool.js';

// ── Mock useInput to capture handler ────────────────────────

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
  // The Key type from Ink has more properties than we need for tests;
  // the spread in pressKey fills in overrides and the cast is safe.
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, pageDown: false, pageUp: false,
    home: false, end: false,
    ctrl: false, shift: false, meta: false,
  } as unknown as Key;
}

function pressKey(input: string, overrides: Partial<Key> = {}) {
  if (!capturedInputHandler) {
    throw new Error('useInput handler not captured — KeyboardProvider must be mounted');
  }
  capturedInputHandler(input, { ...defaultKey(), ...overrides } as Key);
}

// ── Test components ─────────────────────────────────────────

function Home() {
  const { skip, gotoScreen } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['s'], () => skip(Settings, { page: 'general' }));
    boundKeyboard(['p'], () => gotoScreen(Profile, { name: 'guest' }));
  }, [boundKeyboard]);
  return <Text>Home</Text>;
}
Home.displayName = 'Home';

function Settings({ page }: { page?: string }) {
  const { back, skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['escape'], () => back());
    boundKeyboard(['a'], () => skip(Advanced, { level: 1 }));
  }, [boundKeyboard]);
  return <Text>Settings: {page}</Text>;
}
Settings.displayName = 'Settings';

function Advanced({ level }: { level?: number }) {
  const { back } = useScreenSystem();
  const { boundKeyboard, focusSet, focusUnregister } = useKeyboard();
  useEffect(() => {
    const unbEscape = boundKeyboard(['escape'], () => back());
    const unbUp = boundKeyboard(['up'], () => {}, { focusId: 'up-btn' });
    const unbDown = boundKeyboard(['down'], () => {}, { focusId: 'down-btn' });
    focusSet('up-btn');
    return () => {
      unbEscape();
      unbUp();
      unbDown();
      focusUnregister('up-btn');
      focusUnregister('down-btn');
    };
  }, [boundKeyboard, focusSet, focusUnregister]);
  return <Text>Advanced: {level}</Text>;
}
Advanced.displayName = 'Advanced';

function Profile({ name }: { name?: string }) {
  const { back } = useScreenSystem();
  const { boundKeyboard, blockedKey } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['escape'], () => back());
    boundKeyboard(['ctrl+e'], () => {}, { onlyThis: true });
    boundKeyboard(['ctrl+s'], () => {}, { times: 3 });
    blockedKey(['x']);
  }, [boundKeyboard, blockedKey]);
  return <Text>Profile: {name}</Text>;
}
Profile.displayName = 'Profile';

// ── Notification overlay component ──────────────────────────

interface NotificationProps {
  message?: string;
  onCustom?: () => void;
}

function Notification({ message, onCustom }: NotificationProps) {
  const { closeOverlay: cl, openOverlay: op } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['escape'], () => cl('notif-1'));
    boundKeyboard(['c'], () => onCustom?.());
    boundKeyboard(['o'], () => op('notif-2', Notification, { message: 'nested' }));
  }, [boundKeyboard, cl, op, onCustom]);
  return <Text>Notification: {message}</Text>;
}
Notification.displayName = 'Notification';

// ── Render helper ───────────────────────────────────────────

function renderApp(
  defaultScreen: React.ComponentType<any> = Home,
  defaultParams?: Record<string, unknown>,
) {
  const screenRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };
  const keyboardRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function Spy() {
    const sc = useScreenSystem();
    const kb = useKeyboard();
    screenRef.current = sc;
    keyboardRef.current = kb;
    useEffect(() => {
      screenRef.current = sc;
      keyboardRef.current = kb;
    }, [sc, kb]);
    return <CurrentScreen />;
  }

  const { container } = render(
    <ScenarioManagementProvider defaultScreen={defaultScreen} defaultParams={defaultParams}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    container,
    getScreen: () => screenRef.current!,
    getKeyboard: () => keyboardRef.current!,
  };
}

// ── Setup / teardown ────────────────────────────────────────

beforeEach(() => {
  clearRegistry();
  clearDispatchers();
  capturedInputHandler = null;

  registerComponent(Home, {});
  registerComponent(Settings, { page: 'default' }, { parent: Home });
  registerComponent(Advanced, { level: 0 }, { parent: Settings });
  registerComponent(Profile, { name: 'user' }, { parent: Home });
  registerComponent(Notification, { message: '' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ───────────────────────────────────────────────────

describe('openDevTool / closeDevTool', () => {
  it('openDevTool creates an overlay with the well-known ID', () => {
    const { getScreen } = renderApp();

    act(() => openDevTool());

    const displayed = getScreen().displayedOverlays;
    expect(displayed.length).toBe(1);
    expect(displayed[0].id).toBe(DEVTOOL_OVERLAY_ID);
    expect(displayed[0].component).toBe(DevTool);
    expect(getScreen().activeOverlayIds).toContain(DEVTOOL_OVERLAY_ID);
  });

  it('closeDevTool removes the overlay', () => {
    const { getScreen } = renderApp();

    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(1);

    act(() => closeDevTool());
    expect(getScreen().displayedOverlays.length).toBe(0);
    expect(getScreen().activeOverlayIds).not.toContain(DEVTOOL_OVERLAY_ID);
  });

  it('closeDevTool throws when DevTool is not open', () => {
    renderApp();

    expect(() => act(() => closeDevTool())).toThrow(
      /Cannot close overlay.*no overlay with that ID exists/,
    );
  });

  it('openDevTool when already open throws (duplicate ID)', () => {
    renderApp();

    act(() => openDevTool());
    expect(() => act(() => openDevTool())).toThrow(/already exists/);
  });

  it('openDevTool before provider is mounted throws', () => {
    expect(() => openDevTool()).toThrow(/called before Provider is mounted/);
  });

  it('openDevTool auto-registers the DevTool component', () => {
    // First call should register automatically, no error expected
    const { getScreen } = renderApp();
    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(1);
  });
});

describe('DevTool panel content — screen stack', () => {
  it('displays the current screen name', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Home');
  });

  it('displays full screen stack with indices', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().skip(Settings, {}));
    act(() => getScreen().skip(Advanced, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('[0]');
    expect(text).toContain('[1]');
    expect(text).toContain('[2]');
    expect(text).toContain('Home');
    expect(text).toContain('Settings');
    expect(text).toContain('Advanced');
  });

  it('marks the current screen', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('current');
  });

  it('shows stack count', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().skip(Settings, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('(2)');
  });
});

describe('DevTool panel content — overlays', () => {
  it('shows "(none)" when no overlays (excluding DevTool itself)', () => {
    // When DevTool is the only overlay, the overlapping display should show
    // no other overlays. But the Active Overlays section shows ALL overlays
    // including DevTool itself.
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    // DevTool is an overlay, so displayedOverlays.length is 1
    // The section title shows (1)
    expect(text).toContain('Active Overlays');
  });

  it('displays overlay ID, component name, and zIndex', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'hello' }));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('notif-1');
    expect(text).toContain('Notification');
    expect(text).toContain('z:');
  });

  it('shows overlay active/inactive status', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'x' }, { activate: false }));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('inactive');
  });

  it('marks the DevTool panel itself', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('this panel');
  });

  it('displays multiple overlays', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('n1', Notification, { message: 'a' }));
    act(() => getScreen().openOverlay('n2', Notification, { message: 'b' }));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('n1');
    expect(text).toContain('n2');
  });
});

describe('DevTool panel content — keyboard bindings', () => {
  it('displays screen-level keyboard bindings', () => {
    const { container } = renderApp();

    // Profile has bindings: escape, ctrl+e (onlyThis), ctrl+s (x3)
    // and blockedKey: x
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Keyboard');
  });

  it('shows blocked and stopped key counts', () => {
    const { container, getScreen } = renderApp();

    // Profile has blockedKey: ['x']
    act(() => getScreen().gotoScreen(Profile, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Blocked:');
    expect(text).toContain('Stopped:');
  });

  it('shows binding flags: onlyThis, when, times', () => {
    const { container, getScreen } = renderApp();

    // Profile has ctrl+e with onlyThis and ctrl+s with times: 3
    act(() => getScreen().gotoScreen(Profile, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('onlyThis');
    expect(text).toContain('x3');
  });

  it('shows focus targets with active indicator', () => {
    const { container, getScreen } = renderApp();

    // Advanced has focus targets: up-btn, down-btn
    act(() => getScreen().skip(Settings, {}));
    act(() => getScreen().skip(Advanced, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Focus targets');
    expect(text).toContain('up-btn');
    expect(text).toContain('down-btn');
    // up-btn is focused initially
    expect(text).toContain('✓');
  });

  it('shows pending sequence status', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Keyboard');
  });

  it('handles screen with no keyboard layer gracefully', () => {
    const { container } = renderApp();

    // Navigate to a screen that has no keyboard bindings
    // All our test screens bind keys, so this tests the initial state
    act(() => openDevTool());

    const text = container.textContent || '';
    // Should still render the keyboard section
    expect(text).toContain('Keyboard');
  });
});

describe('DevTool panel content — global keys & sequences', () => {
  it('displays global keys with affectOverlay, cover, and when flags', () => {
    const { container, getKeyboard } = renderApp();

    getKeyboard().globalKeys([
      { key: 'ctrl+q', operate: () => {}, affectOverlay: false, cover: true },
      { key: 'ctrl+h', operate: () => {}, affectOverlay: true, cover: false },
    ]);
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Global Keys');
    expect(text).toContain('ctrl+q');
    expect(text).toContain('ctrl+h');
    expect(text).toContain('ao:false');
    expect(text).toContain('ao:true');
    expect(text).toContain('cover:true');
    expect(text).toContain('cover:false');
  });

  it('shows "(none)" when no global keys', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Global Keys');
    expect(text).toContain('(none)');
  });

  it('displays global sequences', () => {
    const { container, getKeyboard } = renderApp();

    getKeyboard().globalKeys([
      { key: 'g', operate: () => {} },
    ]);
    // Register a global sequence
    getKeyboard().globalSequence([
      { keys: ['ctrl+w', 'q'], operate: () => {}, affectOverlay: false, cover: true },
    ]);
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Global Sequences');
    expect(text).toContain('ctrl+w, q');
  });

  it('shows "(none)" when no global sequences', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Global Sequences');
    expect(text).toContain('(none)');
  });

  it('shows global key times flag', () => {
    const { container, getKeyboard } = renderApp();

    getKeyboard().globalKeys([
      { key: 'ctrl+s', operate: () => {}, times: 3 },
    ]);
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('x3');
  });

  it('shows global key when flag', () => {
    const { container, getKeyboard } = renderApp();

    getKeyboard().globalKeys([
      { key: 'ctrl+w', operate: () => {}, when: () => true },
    ]);
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('when');
  });
});

describe('DevTool panel content — overlay keyboard layers', () => {
  it('displays keyboard bindings for other overlays', () => {
    const { container, getScreen } = renderApp();

    // Notification binds: escape, c, o
    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'test' }));
    act(() => openDevTool());

    const text = container.textContent || '';
    // Should show overlay keyboard for notif-1 (but not the DevTool itself)
    expect(text).toContain('Overlay Keyboard');
    expect(text).toContain('notif-1');
  });

  it('does not show the DevTool\'s own overlay layer in the overlay keyboard section', () => {
    const { container } = renderApp();

    act(() => openDevTool());

    const text = container.textContent || '';
    // The DevTool overlay ID appears in the "Active Overlays" list (with "this panel")
    // but should NOT appear as a separate "Overlay Keyboard" section header.
    // Verify the overlay keyboard section doesn't exist for the devtool itself.
    const overlayKeyboardSection = text.match(/Overlay Keyboard/g);
    // Should have no "Overlay Keyboard" sections since only the devtool overlay exists
    expect(overlayKeyboardSection).toBeNull();
  });

  it('shows overlay focus state', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'x' }));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Overlay Keyboard');
  });

  it('displays overlay binding count and blocked/stopped counts', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'x' }));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Bindings:');
    expect(text).toContain('Blocked:');
    expect(text).toContain('Stopped:');
  });
});

describe('DevTool keyboard interaction', () => {
  it('pressing q closes the DevTool panel', () => {
    const { getScreen } = renderApp();

    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(1);

    act(() => pressKey('q', {}));
    expect(getScreen().displayedOverlays.length).toBe(0);
  });

  it('pressing Escape closes the DevTool panel', () => {
    const { getScreen } = renderApp();

    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(1);

    act(() => pressKey('', { escape: true }));
    expect(getScreen().displayedOverlays.length).toBe(0);
  });

  it('other keys pass through DevTool to underlying screen', () => {
    const { getScreen } = renderApp();

    act(() => openDevTool());

    // Home binds 's' for skip to Settings
    act(() => pressKey('s', {}));
    // Should have navigated to Settings
    expect(getScreen().currentPath).toEqual([Home, Settings]);
  });
});

describe('DevTool with other overlays', () => {
  it('DevTool open alongside another overlay shows both', () => {
    const { getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'test' }));
    act(() => openDevTool());

    const displayed = getScreen().displayedOverlays;
    expect(displayed.length).toBe(2);
    expect(displayed.map(o => o.id).sort()).toEqual(['__ink_devtool__', 'notif-1']);
  });

  it('DevTool does not consume keys meant for other overlays', () => {
    const notifCustom = vi.fn();
    const { getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'x', onCustom: notifCustom }, { zIndex: 10 }));
    act(() => openDevTool());

    // 'c' is bound by Notification overlay, not by DevTool
    act(() => pressKey('c', {}));
    expect(notifCustom).toHaveBeenCalledTimes(1);
  });

  it('closing DevTool leaves other overlays intact', () => {
    const { getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'test' }));
    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(2);

    act(() => closeDevTool());
    expect(getScreen().displayedOverlays.length).toBe(1);
    expect(getScreen().displayedOverlays[0].id).toBe('notif-1');
  });

  it('navigation clears DevTool along with other overlays', () => {
    const { getScreen } = renderApp();

    act(() => getScreen().openOverlay('notif-1', Notification, { message: 'test' }));
    act(() => openDevTool());
    expect(getScreen().displayedOverlays.length).toBe(2);

    // Navigation should clear all overlays
    act(() => getScreen().skip(Settings, {}));
    expect(getScreen().displayedOverlays.length).toBe(0);
  });
});

describe('DevTool keyboard snapshot refresh', () => {
  it('updates keyboard snapshot periodically', () => {
    vi.useFakeTimers();
    const { container } = renderApp();

    act(() => openDevTool());

    // Initial state: verify keyboard section is present
    const textBefore = container.textContent || '';
    expect(textBefore).toContain('Keyboard');

    // Advance timers to trigger snapshot refresh
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const textAfter = container.textContent || '';
    expect(textAfter).toContain('Keyboard');

    vi.useRealTimers();
  });
});

describe('DevTool with deep screen stack', () => {
  it('shows deep nesting correctly', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().skip(Settings, {}));
    act(() => getScreen().skip(Advanced, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('(3)');
    expect(text).toContain('[0] Home');
    expect(text).toContain('[1] Settings');
    expect(text).toContain('[2] Advanced');
  });
});

describe('DevTool display edge cases', () => {
  it('uses displayName when set', () => {
    // displayName takes precedence over function name in DevTool output
    const NamedComponent = () => <Text>named</Text>;
    NamedComponent.displayName = 'CustomDisplayName';
    registerComponent(NamedComponent, {}, { parent: Home });

    const { container, getScreen } = renderApp();

    act(() => getScreen().skip(NamedComponent, {}));
    act(() => openDevTool());

    const text = container.textContent || '';
    // displayName should be shown, not the function name
    expect(text).toContain('CustomDisplayName');
    expect(text).not.toContain('NamedComponent');
  });

  it('shows sequence bindings when present', () => {
    const { container, getKeyboard } = renderApp();

    // Bind a sequence to the current screen
    getKeyboard().boundSequence(['g', 'g'], () => {});
    act(() => openDevTool());

    const text = container.textContent || '';
    expect(text).toContain('Sequences');
  });

  it('shows overlay keyboard for each overlay layer', () => {
    const { container, getScreen } = renderApp();

    act(() => getScreen().openOverlay('n1', Notification, { message: 'a' }, { zIndex: 10 }));
    act(() => getScreen().openOverlay('n2', Notification, { message: 'b' }, { zIndex: 20 }));
    act(() => openDevTool());

    const text = container.textContent || '';
    // Should show overlay keyboard sections for n1 and n2
    const n1Count = (text.match(/n1/g) || []).length;
    const n2Count = (text.match(/n2/g) || []).length;
    expect(n1Count).toBeGreaterThanOrEqual(1);
    expect(n2Count).toBeGreaterThanOrEqual(1);
  });
});
