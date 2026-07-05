import React, { useEffect } from 'react';
import { Text } from 'ink';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearDispatchers,
} from '../../src/screen/provider.js';
import {
  clearShortcutOperations,
} from '../../src/keyboard/provider.js';
import { registerComponent } from '../../src/screen/registry.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import {
  Menu,
  GameLevel,
  setupKeyboardTests,
  flush,
  pressKey,
  renderKeyboardApp,
  createTestModal,
} from './base/_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

describe('persistent modal zIndex tie-breaking', () => {
  it('with two persistent modals from same screen, highest zIndex is active after back navigation', async () => {
    const modalLow = createTestModal('ModalLow', ['o']);
    const modalHigh = createTestModal('ModalHigh', ['o']);

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modalLow.open(sc, { persistent: true });
      modalHigh.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], () => {});
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
      kb.boundKeyboard(['b'], () => sc.back());
    });

    await flush();

    await pressKey(stdin, 'o');
    await flush();
    await pressKey(stdin, 'b');
    await flush();

    await pressKey(stdin, 'a');

    expect(modalHigh.handler).toHaveBeenCalledTimes(1);
    expect(modalLow.handler).toHaveBeenCalledTimes(0);
  });

  it('explicit reverse zIndex — lower-creation-order has higher zIndex should win', async () => {
    const handlerLowZ = vi.fn();
    const handlerHighZ = vi.fn();

    function ModalLowZ() {
      const { boundKeyboard } = useKeyboard();
      useEffect(() => { return boundKeyboard(['a'], handlerLowZ); }, [boundKeyboard]);
      return <Text>LOW</Text>;
    }
    ModalLowZ.displayName = 'ModalLowZ';

    function ModalHighZ() {
      const { boundKeyboard } = useKeyboard();
      useEffect(() => { return boundKeyboard(['a'], handlerHighZ); }, [boundKeyboard]);
      return <Text>HIGH</Text>;
    }
    ModalHighZ.displayName = 'ModalHighZ';

    registerComponent(ModalLowZ, {});
    registerComponent(ModalHighZ, {});

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('low', ModalLowZ, {}, { persistent: true, zIndex: 10 });
      sc.openModal('high', ModalHighZ, {}, { persistent: true, zIndex: 20 });
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
      kb.boundKeyboard(['b'], () => sc.back());
    });

    await flush();

    await pressKey(stdin, 'o');
    await flush();
    await pressKey(stdin, 'b');
    await flush();

    await pressKey(stdin, 'a');

    expect(handlerHighZ).toHaveBeenCalledTimes(1);
    expect(handlerLowZ).toHaveBeenCalledTimes(0);
  });
});
