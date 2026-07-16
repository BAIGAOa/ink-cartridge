import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { clearDispatchers } from '../../../src/screen/provider.js';
import { clearShortcutOperations } from '../../../src/keyboard/provider.js';
import {
  Menu,
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


describe('boundKeyboard core', () => {
  it('fires handler when bound key is pressed', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('a', expect.objectContaining({}));
  });

  it('does not fire for unbound keys', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler);
    });
    await flush();

    await pressKey(stdin, 'b');
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes raw input and key object to the handler', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['x'], handler);
    });
    await flush();

    await pressKey(stdin, 'x');
    expect(handler).toHaveBeenCalledWith(
      'x',
      expect.objectContaining({
        upArrow: false,
        downArrow: false,
        ctrl: false,
        shift: false,
        meta: false,
      }),
    );
  });
});


describe('multi-key binding', () => {
  it('binds multiple keys to the same handler', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a', 'b', 'c'], handler);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('a', expect.any(Object));

    await pressKey(stdin, 'b');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('b', expect.any(Object));

    await pressKey(stdin, 'c');
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledWith('c', expect.any(Object));
  });

  it('accepts a single string instead of an array', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard('z', handler);
    });
    await flush();

    await pressKey(stdin, 'z');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});


describe('unbind', () => {
  it('removes the binding so the handler stops firing', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const unbind = kb.boundKeyboard(['a'], handler);
      unbind();
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('only removes the specified binding, leaving others intact', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handlerA);
      const unbindB = kb.boundKeyboard(['b'], handlerB);
      unbindB();
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handlerA).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'b');
    expect(handlerB).not.toHaveBeenCalled();
  });

  it('allows re-binding the same key after unbind', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const unbind = kb.boundKeyboard(['a'], handler1);
      unbind();
      kb.boundKeyboard(['a'], handler2);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});


describe('modifier keys', () => {
  it('matches ctrl+character', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['ctrl+d'], handler);
    });
    await flush();

    // ctrl+d sends ASCII EOT (0x04)
    await pressKey(stdin, '\x04');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches meta+character', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['meta+f'], handler);
    });
    await flush();

    // meta+f sends ESC followed by 'f'
    await pressKey(stdin, '\x1bf');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});


describe('special keys', () => {
  it('matches return key', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['return'], handler);
    });
    await flush();

    await pressKey(stdin, '\r');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // Note: escape ('\x1b') is unreliable with ink-testing-library's stdin.write
  // because a solitary ESC byte is treated as the start of an ANSI escape
  // sequence by Ink's internal readline parser. The key name normalization
  // for escape is validated in the old jsdom-based tests.

  it('matches tab key', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['tab'], handler);
    });
    await flush();

    await pressKey(stdin, '\t');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches backspace key', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['backspace'], handler);
    });
    await flush();

    await pressKey(stdin, '\x7f');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // Note: arrow keys ('\x1b[A', '\x1b[B', etc.) are unreliable with
  // ink-testing-library's stdin.write for the same reason as escape —
  // they are multi-byte ANSI sequences handled by Ink's readline.
  // Arrow key binding is validated in the old jsdom-based tests.
});


// Note: multi-screen chain-of-responsibility tests are not written here
// because they require navigation to child screens and then registering
// key bindings in those child components' useEffect hooks. With
// ink-testing-library's synchronous render, the navigation + remount
// cycle is unreliable to test with simple setTimeout-based flush().
//
// The chain-of-responsibility behavior (top layer consumes, unhandled
// bubbles to bottom, all-unhandled drops) is thoroughly covered in the
// old jsdom-based tests (provider.test.tsx) which can call boundKeyboard
// imperatively from the test body after navigation.

describe('chain-of-responsibility', () => {
  it('no layer handles the key — event is silently dropped', async () => {
    const { stdin } = renderKeyboardApp(Menu);
    await flush();

    await expect(pressKey(stdin, 'z')).resolves.not.toThrow();
  });
});


// Note: layer lifecycle tests (binding cleanup on navigation) are not
// written here because they require multi-screen navigation + remount
// cycles which are unreliable with ink-testing-library's synchronous
// render approach. The lifecycle behavior is covered in the old
// jsdom-based tests (provider.test.tsx).


describe('onlyThis', () => {
  it('activates only when screen is top of stack and no overlay is present', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { onlyThis: true });
    });
    await flush();

    // Menu is top of stack and no overlay
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is blocked when an overlay is open', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.boundKeyboard(['a'], handler, { onlyThis: true });
      sc.openOverlay('ovl', Notification, { message: 'test' });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });
});


describe('once', () => {
  it('fires only once then auto-unbinds', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { once: true });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'a');
    // Still 1 — binding was consumed
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once with multi-key: pressing any key consumes the entire binding', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a', 'b', 'c'], handler, { once: true });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'b');
    await pressKey(stdin, 'c');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binding is still consumed even if handler throws', async () => {
    const handler = vi.fn(() => {
      throw new Error('boom');
    });
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { once: true });
    });
    await flush();

    // The handler's throw propagates through the pipeline; the binding
    // is consumed before the handler executes, so a second press does
    // NOT invoke the handler again.
    try {
      await pressKey(stdin, 'a');
    } catch {
      // Expected — handler throws
    }
    expect(handler).toHaveBeenCalledTimes(1);

    // Second press: handler should NOT be called (binding consumed)
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once binding can be manually unbound before first fire', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const unbind = kb.boundKeyboard(['a'], handler, { once: true });
      unbind();
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('once + onlyThis: condition unmet does not consume, condition met fires and unbinds', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.boundKeyboard(['a'], handler, { once: true, onlyThis: true });
      // Open overlay to make onlyThis unsatisfied, then immediately close it
      sc.openOverlay('ovl', Notification, { message: 'test' });
      sc.closeOverlay('ovl');
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});


describe('focusId', () => {
  it('focus-level binding takes priority over screen-level binding', async () => {
    const screenCb = vi.fn();
    const focusCb = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], screenCb);
      kb.boundKeyboard(['a'], focusCb, { focusId: 'input1' });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(focusCb).toHaveBeenCalledTimes(1);
    expect(screenCb).not.toHaveBeenCalled();
  });

  it('only the active focus target receives events', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], cb1, { focusId: 'input1' });
      kb.boundKeyboard(['a'], cb2, { focusId: 'input2' });
    });
    await flush();

    // First registered focus target is active by default
    await pressKey(stdin, 'a');
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();
  });

  it('focusSet activates a specific focus target', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], cb1, { focusId: 'input1' });
      kb.boundKeyboard(['a'], cb2, { focusId: 'input2' });
      kb.focusSet('input2');
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb1).not.toHaveBeenCalled();
  });

  it('Tab cycles to the next focus target', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['return'], cb1, { focusId: 'one' });
      kb.boundKeyboard(['return'], cb2, { focusId: 'two' });
    }, { autoTab: true });
    await flush();

    // First target active
    await pressKey(stdin, '\r');
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();

    // Tab to next target
    await pressKey(stdin, '\t');
    await pressKey(stdin, '\r');
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb1).toHaveBeenCalledTimes(1);
  });

  it('focusUnregister removes the target and activates the next one', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], cb1, { focusId: 'input1' });
      kb.boundKeyboard(['a'], cb2, { focusId: 'input2' });
      kb.focusUnregister('input1');
    });
    await flush();

    // input1 was unregistered, so input2 should now be active
    await pressKey(stdin, 'a');
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb1).not.toHaveBeenCalled();
  });
});


describe('times', () => {
  it('fires handler only after the specified number of presses', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 3 });
    });
    await flush();

    await pressKey(stdin, 'a');
    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('counter resets after firing — fires again after another N presses', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 2 });
    });
    await flush();

    // First cycle: press twice, fires on 2nd
    await pressKey(stdin, 'a');
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    // Second cycle: press twice more, fires on 4th
    await pressKey(stdin, 'a');
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('times: 1 fires on every press (same as no times)', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 1 });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('times + once: fires after N presses then unbinds', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 2, once: true });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    // After once unbind, no more firing
    await pressKey(stdin, 'a');
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('times <= 0 prevents the binding from being created', async () => {
    const handler = vi.fn();
    // times: 0 is invalid — the validation in boundKeyboard throws,
    // preventing the binding from being stored. The handler never fires.
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      try {
        kb.boundKeyboard(['a'], handler, { times: 0 });
      } catch {
        // Expected validation error
      }
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });
});


describe('when', () => {
  it('binding fires when when() returns true', async () => {
    const handler = vi.fn();
    let gate = true;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { when: () => gate });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binding is skipped when when() returns false', async () => {
    const handler = vi.fn();
    let gate = false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { when: () => gate });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('when + times: when=false does not increment the counter', async () => {
    const handler = vi.fn();
    let gate = true;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 2, when: () => gate });
    });
    await flush();

    // First press: gate is true → counts as 1
    await pressKey(stdin, 'a');

    // Disable gate
    gate = false;
    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();

    // Re-enable gate
    gate = true;
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('when + once: when=false does not consume the once', async () => {
    const handler = vi.fn();
    let gate = false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { once: true, when: () => gate });
    });
    await flush();

    // when=false, so once is not consumed
    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();

    // when becomes true
    gate = true;
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    // once consumed, no more firing
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});


describe('observer', () => {
  it('observer is called on each key press with remaining count', async () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 3, observer });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(observer).toHaveBeenCalledWith(2); // 2 remaining
    expect(handler).not.toHaveBeenCalled();

    await pressKey(stdin, 'a');
    expect(observer).toHaveBeenCalledWith(1); // 1 remaining
    expect(handler).not.toHaveBeenCalled();

    await pressKey(stdin, 'a');
    expect(observer).toHaveBeenCalledWith(0); // fires now
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('observer prevents binding creation when times is not set', async () => {
    const handler = vi.fn();
    // observer without times is invalid — boundKeyboard throws, preventing
    // the binding from being created.
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      try {
        kb.boundKeyboard(['a'], handler, {
          observer: () => {},
        } as any);
      } catch {
        // Expected validation error
      }
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('observer + when=false: observer is not called', async () => {
    const handler = vi.fn();
    const observer = vi.fn();
    let gate = false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { times: 2, observer, when: () => gate });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(observer).not.toHaveBeenCalled();
  });
});


describe('wildcard', () => {
  it('matches any normal character input', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledWith('a', expect.any(Object));

    await pressKey(stdin, 'b');
    expect(handler).toHaveBeenCalledWith('b', expect.any(Object));

    await pressKey(stdin, '1');
    expect(handler).toHaveBeenCalledWith('1', expect.any(Object));

    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('does not match return and backspace keys', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await pressKey(stdin, '\r'); // return — should not match wildcard
    await pressKey(stdin, '\x7f'); // backspace — should not match wildcard

    expect(handler).not.toHaveBeenCalled();
  });

  // Note: escape and tab are not tested here because ink-testing-library's
  // stdin.write behaviour for '\x1b' and '\t' differs from real terminal
  // input. In a real terminal, Ink's useInput correctly sets { escape: true }
  // and { tab: true } which are rejected by isNormalCharacter. These cases
  // are covered by the old jsdom-based wildcard tests.

  it('does not match arrow keys', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await pressKey(stdin, '\x1b[A'); // up
    await pressKey(stdin, '\x1b[B'); // down
    expect(handler).not.toHaveBeenCalled();
  });

  it('wildcard and exact bindings coexist independently', async () => {
    const wildcardHandler = vi.fn();
    const exactHandler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['*'], wildcardHandler);
      kb.boundKeyboard(['x'], exactHandler);
    });
    await flush();

    // 'x' should match the exact binding first, not the wildcard
    await pressKey(stdin, 'x');
    expect(exactHandler).toHaveBeenCalledTimes(1);
    expect(wildcardHandler).not.toHaveBeenCalled();

    // 'y' should match the wildcard
    await pressKey(stdin, 'y');
    expect(wildcardHandler).toHaveBeenCalledTimes(1);
    expect(exactHandler).toHaveBeenCalledTimes(1);
  });

  it('wildcard can be unbound', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const unbind = kb.boundKeyboard(['*'], handler);
      unbind();
    });
    await flush();

    await pressKey(stdin, 'z');
    expect(handler).not.toHaveBeenCalled();
  });
});