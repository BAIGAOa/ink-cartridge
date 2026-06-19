import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
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
  // Safe: building a complete Key from a partial; all booleans defaulted to false
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

function GameLevel({ level }: { level: number }) {
  return <></>;
}
GameLevel.displayName = 'GameLevel';

function Notification({ message }: { message: string }) {
  return <></>;
}
Notification.displayName = 'Notification';

function SubScreen() {
  return <></>;
}
SubScreen.displayName = 'SubScreen';

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Notification, { message: '' });
  registerComponent(SubScreen, {}, { parent: Menu });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
  getScreen: () => ReturnType<typeof useScreenSystem> | null;
} {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };
  const scRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };

  function Spy() {
    const kb = useKeyboard();
    const sc = useScreenSystem();
    useEffect(() => {
      kbRef.current = kb;
      scRef.current = sc;
    }, [kb, sc]);
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
    getScreen: () => scRef.current,
  };
}

describe('times — counting and reset', () => {
  it.each([
    { times: 1, desc: 'times=1 fires every press (boundary)' },
    { times: 2, desc: 'times=2 fires on 2nd, 4th, 6th' },
    { times: 3, desc: 'times=3 fires on 3rd, 6th' },
  ])('$desc', ({ times }) => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times });

    const rounds = times === 1 ? 3 : 2;
    for (let r = 0; r < rounds; r++) {
      for (let i = 1; i < times; i++) {
        pressKey('a');
        expect(handler).toHaveBeenCalledTimes(r);
      }
      pressKey('a');
      expect(handler).toHaveBeenCalledTimes(r + 1);
    }
  });

  it('no times — fires every press (backward compat)', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler);

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it.each([
    { times: 0, desc: 'times=0 throws' },
    { times: -1, desc: 'times=-1 throws' },
  ])('$desc', ({ times }) => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    expect(() => {
      getKeyboard()!.boundKeyboard(['a'], () => {}, { times });
    }).toThrow('[Ink-Router-Kit] boundKeyboard() times option must be >= 1.');
  });
});

describe('times + once', () => {
  it('once: true unbinds after threshold reached', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 3, once: true });

    pressKey('a');
    pressKey('a');
    expect(handler).not.toHaveBeenCalled();

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once: true — handler throws, binding still removed', () => {
    const handler = vi.fn(() => {
      throw new Error('test error');
    });
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, once: true });

    pressKey('a');
    expect(() => pressKey('a')).toThrow('test error');
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once: true without times — legacy: first press unbinds', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { once: true });

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('times + focusId + once — pairwise core', () => {
  it('focus target times binding works independently', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, focusId: 'inp' });

    pressKey('a');
    expect(handler).not.toHaveBeenCalled();
    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('separate focus targets have isolated counters', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler1, { times: 2, focusId: 'input1' });
    getKeyboard()!.boundKeyboard(['a'], handler2, { times: 3, focusId: 'input2' });

    pressKey('a');
    pressKey('a');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(0);
  });

  it('times + focusId + once unbinds after threshold', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, focusId: 'inp', once: true });

    pressKey('a');
    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);

    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('times + onlyThis + overlay', () => {
  it('onlyThis blocks counting when overlay is active, resumes after close', () => {
    const handler = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    getKeyboard()!.boundKeyboard(['a'], handler, { times: 2, onlyThis: true });

    pressKey('a');
    expect(handler).not.toHaveBeenCalled();

    act(() => getScreen()!.openOverlay('test-ovl', Notification, { message: 'test' }));
    pressKey('a');
    pressKey('a');
    expect(handler).not.toHaveBeenCalled();

    act(() => getScreen()!.closeOverlay('test-ovl'));
    pressKey('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('times — binding independence and priority', () => {
  it('multi-key binding shares one counter', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a', 'b'], handler, { times: 2 });

    pressKey('a');
    expect(handler).not.toHaveBeenCalled();
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(1);
    pressKey('a');
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('different bindings have independent counters', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a'], h1, { times: 2 });
    getKeyboard()!.boundKeyboard(['b'], h2, { times: 3 });

    pressKey('a');
    pressKey('b');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();

    pressKey('a');
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();

    pressKey('b');
    pressKey('b');
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('same key, two times bindings — first registered always wins', () => {
    const h2 = vi.fn();
    const h3 = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['x'], h2, { times: 2 });
    getKeyboard()!.boundKeyboard(['x'], h3, { times: 3 });

    pressKey('x');
    pressKey('x');
    expect(h2).toHaveBeenCalledTimes(1);
    expect(h3).not.toHaveBeenCalled();

    pressKey('x');
    pressKey('x');
    expect(h2).toHaveBeenCalledTimes(2);
    expect(h3).not.toHaveBeenCalled();
  });
});

describe('times — layer bubbling (sub-threshold consumption)', () => {
  it('top layer times consumes events even below threshold, bottom never fires', () => {
    const topH = vi.fn();
    const bottomH = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    getKeyboard()!.boundKeyboard(['x'], bottomH);
    act(() => getScreen()!.skip(SubScreen, {}));
    getKeyboard()!.boundKeyboard(['x'], topH, { times: 3 });

    pressKey('x');
    pressKey('x');
    expect(topH).not.toHaveBeenCalled();
    expect(bottomH).not.toHaveBeenCalled();

    pressKey('x');
    expect(topH).toHaveBeenCalledTimes(1);
    expect(bottomH).not.toHaveBeenCalled();
  });

  it('after threshold fire + reset, next cycle still consumes events', () => {
    const topH = vi.fn();
    const bottomH = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    getKeyboard()!.boundKeyboard(['x'], bottomH);
    act(() => getScreen()!.skip(SubScreen, {}));
    getKeyboard()!.boundKeyboard(['x'], topH, { times: 2 });

    pressKey('x');
    pressKey('x');
    expect(topH).toHaveBeenCalledTimes(1);
    expect(bottomH).not.toHaveBeenCalled();

    pressKey('x');
    expect(topH).toHaveBeenCalledTimes(1);
    expect(bottomH).not.toHaveBeenCalled();
  });
});

describe('times + blockedKey / stop', () => {
  it('blockedKey penetration — lower layer times counts normally', () => {
    const bottomH = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    getKeyboard()!.boundKeyboard(['x'], bottomH, { times: 2 });
    act(() => getScreen()!.skip(SubScreen, {}));
    getKeyboard()!.blockedKey(['x']);

    pressKey('x');
    expect(bottomH).not.toHaveBeenCalled();
    pressKey('x');
    expect(bottomH).toHaveBeenCalledTimes(1);
  });

  it('stop prevents propagation — lower layer times never counts', () => {
    const bottomH = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    getKeyboard()!.boundKeyboard(['x'], bottomH, { times: 2 });
    act(() => getScreen()!.skip(SubScreen, {}));
    getKeyboard()!.stop(['x']);

    pressKey('x');
    pressKey('x');
    expect(bottomH).not.toHaveBeenCalled();
  });
});

describe('times — key type boundaries', () => {
  it('wildcard * with times — any normal char advances counter', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['*'], handler, { times: 2 });

    pressKey('a');
    expect(handler).not.toHaveBeenCalled();
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('b', expect.objectContaining({}));
  });

  it('wildcard + times — special keys do not consume count', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['*'], handler, { times: 2 });

    pressKey('a');
    pressKey('', { escape: true });
    expect(handler).not.toHaveBeenCalled();

    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ctrl+char supports times', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['ctrl+d'], handler, { times: 2 });

    pressKey('d', { ctrl: true });
    expect(handler).not.toHaveBeenCalled();
    pressKey('d', { ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('special keys (escape) support times', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['escape'], handler, { times: 3 });

    pressKey('', { escape: true });
    pressKey('', { escape: true });
    expect(handler).not.toHaveBeenCalled();
    pressKey('', { escape: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
