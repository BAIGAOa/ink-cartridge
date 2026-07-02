import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import {
  clearDispatchers,
} from '../../../src/screen/provider.js';
import { registerComponent } from '../../../src/screen/registry.js';
import {
  clearShortcutOperations,
} from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';
import {
  Menu,
  GameLevel,
  Notification,
  setupKeyboardTests,
  flush,
  pressKey,
  renderKeyboardApp,
} from './_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

/*
 * Intentionally skipped tests and the reasons:
 *
 * 1. Calling globalKeys when no screen is mounted.
 *    Same pattern as blockedKey / stop / boundSequence — the error is
 *    thrown from the registration side, not from useKeyboard().  The
 *    globalKeys function itself does NOT check getCurrentOwner(),
 *    so this path does not exist for globalKeys.
 *
 * 2. topComponent is null in checkGlobalKey → skips firing.
 *    Requires an empty screen path which is hard to trigger through
 *    the public API (ScenarioManagementProvider always initialises
 *    with a non-empty path).  Same limitation as the other error tests.
 *
 * @2026-07-02 v3.8.0
 */

describe('globalKeys error handling', () => {
  it('throws when times is less than 1', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.globalKeys([{ key: 'x', operate: () => {}, times: 0 }]);
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] globalKeys() times option must be >= 1.',
    );
  });

  it('throws when observer is set without times', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.globalKeys([{ key: 'x', operate: () => {}, observer: () => {} }]);
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] globalKeys() observer option requires times option to be set.',
    );
  });

  it('throws when operate is a string referencing an unregistered shortcut action', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.globalKeys([{ key: 'x', operate: 'unregAction' }]);
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge]You want to call the shortcut unregAction in the global key, but it is not registered',
    );
  });
});

describe('globalKeys basic matching', () => {
  it('fires operate when the registered key is pressed', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not fire when a different key is pressed', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn }]);
    });
    await flush();

    await pressKey(stdin, 'y');
    expect(fn).not.toHaveBeenCalled();
  });

  it('accepts an array of keys — any matching key triggers operate', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: ['a', 'b'], operate: fn }]);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(fn).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('globalKeys affectOverlay', () => {
  it('affectOverlay: true fires before the overlay layer', async () => {
    // When affectOverlay is true the global key runs at stage ②
    // (before overlay).  An overlay binding for the same key would
    // normally consume it, but the global key fires first.
    const globalFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.globalKeys([{ key: 'x', operate: globalFn, affectOverlay: true }]);
      sc.openOverlay('ovl', Notification, { message: 'test' });
    });
    await flush();
    // The overlay's own bindings are set up in Notification's useEffect,
    // but since globalKey fires at stage ② before overlays at stage ③,
    // we can verify the global fires regardless of the overlay.
    await pressKey(stdin, 'x');
    expect(globalFn).toHaveBeenCalledTimes(1);
  });

  it('affectOverlay: false (default) fires after the overlay layer', async () => {
    // affectOverlay: false global keys fire at stage ⑤, after overlays
    // at stage ③.  If an overlay consumes the key the global never fires.
    const globalFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.globalKeys([{ key: 'x', operate: globalFn }]);
      // The overlay does NOT bind 'x' so the key is not consumed at
      // stage ③ — it falls through to global keys at stage ⑤.
      sc.openOverlay('ovl', Notification, { message: 'test' });
    });
    await flush();

    // No overlay handler for 'x', so it reaches the global key.
    await pressKey(stdin, 'x');
    expect(globalFn).toHaveBeenCalledTimes(1);
  });

  it('affectOverlay: true does NOT fire when no overlay is active', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, affectOverlay: true }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    // No overlay active and executeWhenNoOverlay is not set, so the
    // global key is skipped.
    expect(fn).not.toHaveBeenCalled();
  });

  it('affectOverlay: true + executeWhenNoOverlay: true fires even without overlay', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([
        { key: 'x', operate: fn, affectOverlay: true, executeWhenNoOverlay: true },
      ]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('globalKeys cover', () => {
  it('cover: false prevents screen-level override — boundKeyboard throws', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.globalKeys([
          { key: 'x', operate: () => {}, cover: false, category: [TestScreen] },
        ]);
        // This should throw because cover: false forbids overriding.
        kb.boundKeyboard(['x'], () => {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      'cover: false, so overriding is not allowed.',
    );
  });

  it('cover: true (default) — screen boundKeyboard overrides the global key', async () => {
    const globalFn = vi.fn();
    const screenFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: globalFn }]);
      // Screen-level binding for the same key overrides the global key
      // because cover defaults to true.
      kb.boundKeyboard(['x'], screenFn);
    });
    await flush();

    await pressKey(stdin, 'x');
    // Screen handler fires, global is overridden.
    expect(screenFn).toHaveBeenCalledTimes(1);
    expect(globalFn).not.toHaveBeenCalled();
  });

  it('cover: true + affectOverlay: true — overlay overrides the global key', async () => {
    const globalFn = vi.fn();

    // Use an inline overlay that binds 'x' so it overrides the global.
    function BindingOverlay() {
      const kb = useKeyboard();
      const overlayFn = vi.fn();
      // The global key (affectOverlay:true) fires at stage ②, BEFORE the
      // overlay at stage ③.  At stage ② the processor checks whether any
      // overlay has registered an override for this key — if yes, the
      // global skips itself so the overlay can handle the key at stage ③.
      // @2026-07-02 v3.8.0
      useEffect(() => {
        kb.boundKeyboard(['x'], overlayFn);
      }, []);
      return <Text>Overlay</Text>;
    }
    BindingOverlay.displayName = 'BindingOverlay';

    // Register the overlay component so openOverlay can use it.
    registerComponent(BindingOverlay, {});

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.globalKeys([{ key: 'x', operate: globalFn, affectOverlay: true }]);
      sc.openOverlay('ovl', BindingOverlay, {});
    });
    await flush();

    await pressKey(stdin, 'x');
    // The overlay binding fires at stage ③ after the global refrains
    // at stage ② due to the override check.
		 await flush()
    expect(globalFn).toHaveBeenCalledTimes(0);
  });
});

describe('globalKeys category', () => {
  it('category omitted or "*" — fires on all screens', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      // No category means all screens.
      kb.globalKeys([{ key: 'x', operate: fn }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('category restricts to specific screens — fires only when topComponent matches', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      // Restrict to GameLevel — Menu is the current screen so the
      // global key should NOT fire.
      kb.globalKeys([{ key: 'x', operate: fn, category: [GameLevel] }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    // Menu is top of stack, not GameLevel — global key is skipped.
    expect(fn).not.toHaveBeenCalled();
  });

  it('category: [] — never fires', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, category: [] }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('globalKeys when', () => {
  it('when returns true — global key fires', async () => {
    const gate = true;
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, when: () => gate }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('when returns false — global key is skipped', async () => {
    const gate = false;
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, when: () => gate }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('globalKeys times', () => {
  it('times: 3 — first two presses are consumed, third fires operate', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, times: 3 }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    await pressKey(stdin, 'x');
    // First two presses are silently consumed by the times counter.
    expect(fn).not.toHaveBeenCalled();

    // Third press — counter reaches times, operate fires, counter resets.
    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('counter resets after firing — a new cycle starts', async () => {
    const fn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, times: 2 }]);
    });
    await flush();

    // First cycle.
    await pressKey(stdin, 'x');
    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);

    // Second cycle: need 2 more presses.
    await pressKey(stdin, 'x');
    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('observer is called on each press with remaining count', async () => {
    const fn = vi.fn();
    const observer = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn, times: 3, observer }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    // remaining = 3 - 1 = 2
    expect(observer).toHaveBeenLastCalledWith(2);

    await pressKey(stdin, 'x');
    // remaining = 3 - 2 = 1
    expect(observer).toHaveBeenLastCalledWith(1);

    await pressKey(stdin, 'x');
    // remaining = 3 - 3 = 0, handler fires
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('globalKeys mode', () => {
  it('default mode (replace) — second call replaces the first', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn1 }]);
      // Second call with default mode replaces the first.
      kb.globalKeys([{ key: 'x', operate: fn2 }]);
    });
    await flush();

    await pressKey(stdin, 'x');
    // Only the second registration is active.
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('mode: "add" — second call appends, both registrations coexist', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: fn1 }]);
      kb.globalKeys([{ key: 'x', operate: fn2 }], { mode: 'add' });
    });
    await flush();

    await pressKey(stdin, 'x');
    // The first matching entry in the array fires first and consumes
    // the event — so fn1 fires, fn2 does not.
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled();
  });
});

describe('globalKeys operate string reference', () => {
  it('operate as a string resolves to the registered shortcut action', async () => {
    const actionFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        { actionId: 'save', action: actionFn, keys: ['s'] },
      ]);
      kb.globalKeys([{ key: 's', operate: 'save' }]);
    });
    await flush();

    await pressKey(stdin, 's');
    expect(actionFn).toHaveBeenCalledTimes(1);
  });
});

describe('globalKeys screen stack interaction', () => {
  it('global key fires when no screen-level binding consumes the key', async () => {
    const globalFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: globalFn }]);
      // No screen-level binding for 'x' — the global key acts as fallback.
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(globalFn).toHaveBeenCalledTimes(1);
  });

  it('global key does NOT fire when screen-level boundKeyboard already consumed the key', async () => {
    const globalFn = vi.fn();
    const screenFn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: 'x', operate: globalFn }]);
      // Pipeline: ⑤ GlobalKey → ⑥ Screen stack.  The global key's cover
      // check (default true) sees the screen-level override and skips.
      // The screen binding then fires at stage ⑥.
      kb.boundKeyboard(['x'], screenFn);
    });
    await flush();

    await pressKey(stdin, 'x');
    // Screen handler overrides (cover defaults to true), global skipped.
    expect(screenFn).toHaveBeenCalledTimes(1);
    expect(globalFn).not.toHaveBeenCalled();
  });

  it('stack top changes — category check re-evaluated on each key press', async () => {
    const fn = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.globalKeys([{ key: 'x', operate: fn, category: [GameLevel] }]);
      // Navigate to GameLevel so the category matches.
      sc.skip(GameLevel, { level: 1 });
    });
    await flush();

    // Top of stack is now GameLevel, which is in the category whitelist.
    await pressKey(stdin, 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
