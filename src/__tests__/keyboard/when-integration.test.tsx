import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import type { Key } from 'ink';

// ── Mock useInput ──────────────────────────────────────────
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

// ── Screens ────────────────────────────────────────────────
function Menu(): React.ReactElement {
  return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

function Game(): React.ReactElement {
  return React.createElement('div', null, 'Game');
}
Game.displayName = 'Game';

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
  registerComponent(Game, {}, { parent: Menu });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Render helper ──────────────────────────────────────────
function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
  getScreen: () => ReturnType<typeof useScreenSystem> | null;
} {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };
  const scRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };

  function Spy(): React.ReactElement {
    const kb = useKeyboard();
    const sc = useScreenSystem();
    useEffect(() => {
      kbRef.current = kb;
      scRef.current = sc;
    }, [kb, sc]);
    return React.createElement('div', null);
  }

  render(
    React.createElement(
      ScenarioManagementProvider,
      { defaultScreen },
      React.createElement(KeyboardProvider, null, React.createElement(Spy)),
    ),
  );

  return {
    getKeyboard: () => kbRef.current,
    getScreen: () => scRef.current,
  };
}

import { useEffect } from 'react';

// ── Tests ──────────────────────────────────────────────────

describe('when integration', () => {
  describe('when + once interaction', () => {
    it('does NOT consume once when when() returns false', () => {
      let whenFlag = false;
      const handler = vi.fn();
      const { getKeyboard } = renderKeyboardTree(Menu);

      getKeyboard()!.boundKeyboard(['return'], handler, {
        once: true,
        when: () => whenFlag,
      });

      // when=false → handler should NOT fire, once NOT consumed
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(0);

      // when=true → handler fires, once consumed
      whenFlag = true;
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);

      // once already consumed → next press should NOT fire
      whenFlag = true;
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('when + times interaction', () => {
    it('does NOT increment times counter when when() returns false', () => {
      let whenFlag = false;
      const handler = vi.fn();
      const { getKeyboard } = renderKeyboardTree(Menu);

      getKeyboard()!.boundKeyboard(['return'], handler, {
        times: 2,
        when: () => whenFlag,
      });

      // when=false → should not count toward times
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(0);

      // when=true, 1st press → times=1 of 2, should not fire yet
      whenFlag = true;
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(0);

      // when=true, 2nd press → times=2 → fires
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('when + onlyThis AND relationship', () => {
    it('requires BOTH when and onlyThis to be satisfied', () => {
      let whenFlag = false;
      const handler = vi.fn();
      const { getKeyboard } = renderKeyboardTree(Menu);

      getKeyboard()!.boundKeyboard(['return'], handler, {
        onlyThis: true,
        when: () => whenFlag,
      });

      // No overlay, when=false → onlyThis is satisfied but when is not
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(0);

      // No overlay, when=true → both satisfied → fires
      whenFlag = true;
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('globalKeys + when', () => {
    it('skips global key when when() returns false', () => {
      let whenFlag = false;
      const handler = vi.fn();
      const { getKeyboard } = renderKeyboardTree(Menu);

      getKeyboard()!.globalKeys([{
        key: 'escape',
        operate: handler,
        when: () => whenFlag,
      }]);

      // when=false → global key should not fire
      pressKey('', { escape: true });
      expect(handler).toHaveBeenCalledTimes(0);

      // when=true → global key fires
      whenFlag = true;
      pressKey('', { escape: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('blockedKey + when', () => {
    it('only blocks key when when() returns true', () => {
      let whenFlag = false;
      const handler = vi.fn();
      const { getKeyboard } = renderKeyboardTree(Menu);

      getKeyboard()!.blockedKey(['return'], { when: () => whenFlag });
      getKeyboard()!.boundKeyboard(['return'], handler);

      // when=false → key is NOT blocked → binding fires
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);

      // when=true → key IS blocked → binding does NOT fire
      whenFlag = true;
      pressKey('', { return: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
