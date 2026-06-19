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
  return <>'Menu'</>;
}
Menu.displayName = 'Menu';

function GameLevel({ level }: { level: number }) {
  return <>{String(level)}</>;
}
GameLevel.displayName = 'GameLevel';

function Notification({ message }: { message: string }) {
  return <>{message}</>;
}
Notification.displayName = 'Notification';

function SubScreen() {
  return <>'SubScreen'</>;
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

describe('boundSequence — basic', () => {
  it('fires handler when full sequence is completed quickly', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], handler);

    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(0);

    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires handler for a 3-key sequence', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['a', 'b', 'c'], handler);

    pressKey('a');
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(0);

    pressKey('c');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire handler when second key does not match the remainder', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], handler);

    pressKey('g');
    pressKey('x');
    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('sequence starting over works after first completion', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], handler);

    pressKey('g');
    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(1);

    // Second sequence
    pressKey('g');
    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('boundSequence — timeout', () => {
  it('cancels sequence after default timeout', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], handler, { timeout: 300 });

    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(0);

    // Advance past the timeout
    vi.advanceTimersByTime(301);

    // After timeout, the next 'g' starts a new sequence, does not complete old one
    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(0);

    vi.useRealTimers();
  });

  it('cancels sequence after custom timeout', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['a', 'b'], handler, { timeout: 200 });

    pressKey('a');
    vi.advanceTimersByTime(201);

    // After timeout 'b' starts a new sequence attempt with first key 'b' (no match)
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(0);

    vi.useRealTimers();
  });

  it('completes sequence within timeout', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['a', 'b'], handler, { timeout: 300 });

    pressKey('a');
    vi.advanceTimersByTime(200);
    pressKey('b');
    expect(handler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('resets timeout on each matching key press for multi-key sequences', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['x', 'y', 'z'], handler, { timeout: 200 });

    pressKey('x');
    vi.advanceTimersByTime(150);
    pressKey('y');
    // timeout resets from 'y'

    vi.advanceTimersByTime(150);
    pressKey('z');
    expect(handler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('boundSequence — non-exclusive mode (default)', () => {
  it('mismatch key cancels sequence and triggers normal boundKeyboard binding', () => {
    const seqHandler = vi.fn();
    const postHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler);
    getKeyboard()!.boundKeyboard(['x'], postHandler);

    pressKey('g'); // starts sequence
    expect(seqHandler).toHaveBeenCalledTimes(0);

    pressKey('x'); // mismatch → cancel sequence, x goes to normal binding
    expect(seqHandler).toHaveBeenCalledTimes(0);
    expect(postHandler).toHaveBeenCalledTimes(1);
  });

  it('after mismatch cancel, pressing the first key again starts a new sequence', () => {
    const seqHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler);

    pressKey('g'); // start
    pressKey('x'); // cancel
    pressKey('g'); // new start
    pressKey('g'); // complete
    expect(seqHandler).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence — exclusive mode', () => {
  it('mismatch key is ignored and sequence continues waiting', () => {
    vi.useFakeTimers();
    const seqHandler = vi.fn();
    const normalHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler, { exclusive: true, timeout: 300 });
    getKeyboard()!.boundKeyboard(['x'], normalHandler);

    pressKey('g'); // start sequence
    pressKey('x'); // mismatch → ignored (exclusive)
    expect(normalHandler).toHaveBeenCalledTimes(0);
    expect(seqHandler).toHaveBeenCalledTimes(0);

    // Still within timeout — complete the sequence
    vi.advanceTimersByTime(100);
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('exclusive mode ignores multiple mismatches', () => {
    vi.useFakeTimers();
    const seqHandler = vi.fn();
    const normalHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['a', 'b', 'c'], seqHandler, { exclusive: true, timeout: 500 });
    getKeyboard()!.boundKeyboard(['*'], normalHandler);

    pressKey('a');
    pressKey('x');
    pressKey('y');
    pressKey('z');
    expect(normalHandler).toHaveBeenCalledTimes(0);

    pressKey('b');
    pressKey('c');
    expect(seqHandler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('boundSequence — onlyThis', () => {
  it('sequence only fires when onlyThis condition is met', () => {
    const seqHandler = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler, { onlyThis: true });

    // No overlay active — sequence should work
    pressKey('g');
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(1);

    // Open overlay — onlyThis condition fails
    act(() => getScreen()!.openOverlay('ov1', Notification, { message: 'test' }));
    pressKey('g');
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(1); // no change
  });
});

describe('boundSequence — focusId', () => {
  it('sequence only starts when the matching focus target is active', () => {
    const seqHandler = vi.fn();
    const normalHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler, { focusId: 'input1' });
    getKeyboard()!.boundKeyboard(['g'], normalHandler);

    // No focus target active — sequence should NOT start, key goes to normal binding
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(0);
    expect(normalHandler).toHaveBeenCalledTimes(1);
  });

  it('sequence works when focus target is active', () => {
    const seqHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    // Register a dummy binding to create the focus target
    getKeyboard()!.boundKeyboard(['x'], () => {}, { focusId: 'input1' });
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler, { focusId: 'input1' });
    getKeyboard()!.focusSet('input1');

    pressKey('g');
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence — multiple sequences with same first key', () => {
  it('first registered sequence wins', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], handler1);
    getKeyboard()!.boundSequence(['g', 'x'], handler2);

    pressKey('g');
    pressKey('g');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(0);
  });
});

describe('boundSequence — focus switch cancels pending sequence', () => {
  it('changing focus clears pending sequence', () => {
    const seqHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    // Register focus targets first
    getKeyboard()!.boundKeyboard(['g'], () => {}, { focusId: 'input1' });
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler, { focusId: 'input1' });
    getKeyboard()!.boundKeyboard(['x'], () => {}, { focusId: 'input2' });
    getKeyboard()!.focusSet('input1');

    pressKey('g'); // start sequence

    // Switch focus — cancels pending sequence
    getKeyboard()!.focusSet('input2');

    // Press second key — sequence should be cancelled
    pressKey('g');
    expect(seqHandler).toHaveBeenCalledTimes(0);
  });
});

describe('boundSequence — unbind', () => {
  it('unbind function removes the sequence registration', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    const unbind = getKeyboard()!.boundSequence(['g', 'g'], handler);

    unbind();

    pressKey('g');
    pressKey('g');
    expect(handler).toHaveBeenCalledTimes(0);
  });
});

describe('boundSequence — sequence priority over boundKeyboard', () => {
  it('sequence consumes first matching key, boundKeyboard does not fire for it', () => {
    const seqHandler = vi.fn();
    const kbHandler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['g', 'g'], seqHandler);
    getKeyboard()!.boundKeyboard(['g'], kbHandler);

    pressKey('g'); // consumed by sequence startup
    expect(kbHandler).toHaveBeenCalledTimes(0);

    pressKey('g'); // completes sequence
    expect(seqHandler).toHaveBeenCalledTimes(1);
    expect(kbHandler).toHaveBeenCalledTimes(0);
  });
});

describe('boundSequence — special keys', () => {
  it('supports sequence of escape keys', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['escape', 'escape'], handler);

    pressKey('', { escape: true });
    expect(handler).toHaveBeenCalledTimes(0);

    pressKey('', { escape: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports sequence with ctrl+key', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['ctrl+w', 'ctrl+q'], handler);

    pressKey('w', { ctrl: true });
    expect(handler).toHaveBeenCalledTimes(0);

    pressKey('q', { ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports mixed sequence of character and special key', () => {
    const handler = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundSequence(['c', 'w'], handler);

    pressKey('c');
    expect(handler).toHaveBeenCalledTimes(0);

    pressKey('w');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
