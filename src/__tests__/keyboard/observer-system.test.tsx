import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import type { Key } from 'ink';

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

function pressKey(input: string, key: Partial<Key> = {}) {
  if (!capturedInputHandler) throw new Error('useInput handler not captured');
  // Safe: building a complete Key shape from a partial; all booleans default to false
  capturedInputHandler(input, {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, space: false, pageDown: false, pageUp: false,
    home: false, end: false, insert: false,
    ctrl: false, shift: false, meta: false, numLock: false,
    ...key,
  } as Key);
}

function Menu() {
  return <></>;
}
Menu.displayName = 'Menu';

function SubScreen() {
  return <></>;
}
SubScreen.displayName = 'SubScreen';

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
  registerComponent(SubScreen, {}, { parent: Menu });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
} {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function Spy() {
    const kb = useKeyboard();
    useEffect(() => {
      kbRef.current = kb;
    }, [kb]);
    return <></>;
  }

  render(
    <ScenarioManagementProvider defaultScreen={defaultScreen}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    getKeyboard: () => kbRef.current,
  };
}

function pressTimes(n: number) {
  for (let i = 0; i < n; i++) pressKey('a');
}

// 4-factor pairwise: times(1/2/5) × path(screen/focus) × once(t/f) × when(none/trueFn/falseFn)
// 36 full combinations reduced to 9 tests covering all 37 pairwise factor combinations.

describe('observer — pairwise (boundKeyboard)', () => {
  it('P1: times=1, screen, once, no-when', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 1, once: true, observer });

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('P2: times=1, focus, !once, when→true', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => true);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 1, focusId: 'inp', observer, when });

    pressKey('a');
    expect(when).toHaveBeenCalled();
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('P3: times=1, focus, once, when→false — never fires', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => false);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 1, once: true, focusId: 'inp', observer, when });

    pressKey('a');
    pressKey('a');
    pressKey('a');
    expect(when).toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('P4: times=2, screen, !once, when→false — never fires', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => false);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, observer, when });

    pressKey('a');
    pressKey('a');
    expect(observer).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('P5: times=2, focus, once, no-when', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, once: true, focusId: 'inp', observer });

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('P6: times=2, screen, !once, when→true', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => true);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, observer, when });

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenLastCalledWith(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('P7: times=5, focus, !once, no-when', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 5, focusId: 'inp', observer });

    pressTimes(4);
    expect(observer).toHaveBeenCalledTimes(4);
    expect(observer).toHaveBeenNthCalledWith(1, 4);
    expect(observer).toHaveBeenNthCalledWith(2, 3);
    expect(observer).toHaveBeenNthCalledWith(3, 2);
    expect(observer).toHaveBeenNthCalledWith(4, 1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(5);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(6);
    expect(observer).toHaveBeenLastCalledWith(4);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('P8: times=5, screen, once, when→true', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => true);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 5, once: true, observer, when });

    pressTimes(4);
    expect(observer).toHaveBeenCalledTimes(4);
    expect(observer).toHaveBeenNthCalledWith(1, 4);
    expect(observer).toHaveBeenNthCalledWith(4, 1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(5);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('P9: times=5, screen, !once, when→false — never fires', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => false);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 5, observer, when });

    pressTimes(10);
    expect(observer).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('observer — globalKeys pairwise', () => {
  it('GK1: globalKeys with observer + times=3, observer receives correct remaining sequence', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.globalKeys([{ key: 'a', operate: handler, times: 3, observer }]);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(2);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenLastCalledWith(1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(4);
    expect(observer).toHaveBeenLastCalledWith(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('GK2: globalKeys observer with when→false, observer never called', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const when = vi.fn(() => false);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.globalKeys([{ key: 'a', operate: handler, times: 2, observer, when }]);

    pressKey('a');
    pressKey('a');
    expect(observer).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('GK3: globalKeys observer counter resets across rounds', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.globalKeys([{ key: 'a', operate: handler, times: 2, observer }]);

    pressKey('a');
    expect(observer).toHaveBeenCalledWith(1);
    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(1);
    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('observer — boundary conditions', () => {
  it('observer without times on boundKeyboard throws', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    expect(() => {
      // Deliberately bypassing types to test runtime error for observer without times
      getKeyboard()!.boundKeyboard(['a'], () => {}, { observer: () => {} } as any);
    }).toThrow('[Ink-Router-Kit] boundKeyboard() observer option requires times option to be set.');
  });

  it('observer without times on globalKeys throws', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    expect(() => {
      // Deliberately bypassing types to test runtime error for observer without times
      getKeyboard()!.globalKeys([{ key: 'a', operate: () => {}, observer: () => {} } as any]);
    }).toThrow('[Ink-Router-Kit] globalKeys() observer option requires times option to be set.');
  });

  it('counter resets across rounds: times=2 pressed 5 times, handler on 2nd and 4th', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, observer });

    pressKey('a');
    expect(observer).toHaveBeenCalledWith(1);
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(1);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(2);

    pressKey('a');
    expect(observer).toHaveBeenLastCalledWith(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('once unbinds: observer stops after handler fires', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, once: true, observer });

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('when toggling false stops observer, toggling true resumes from preserved count', () => {
    const handler = vi.fn();
    const observer = vi.fn();
    let enabled = true;
    const when = vi.fn(() => enabled);
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 3, observer, when });

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(2);

    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenLastCalledWith(1);

    enabled = false;
    pressKey('a');
    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(handler).not.toHaveBeenCalled();

    enabled = true;
    pressKey('a');
    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenLastCalledWith(0);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
