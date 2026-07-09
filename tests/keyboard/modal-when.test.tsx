import { clearShortcutOperations } from "../../src/keyboard/provider.js";
import { clearDispatchers } from "../../src/screen/provider.js";
import { flush, Menu, pressKey, renderKeyboardApp, setupKeyboardTests } from "./base/_helpers.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import React, { useEffect, useRef } from "react";
import { Text } from "ink";
import { registerComponent } from "../../src/screen/registry.js";
import { useKeyboard } from "../../src/keyboard/hook.js";
import { useScreenSystem } from "../../src/screen/hook.js";
import type { AllowModalOptions } from "../../src/keyboard/index.js";

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearShortcutOperations();
  clearDispatchers();
});

describe('allowModal with when condition', () => {
  test('when: () => false prevents the key from passing through', async () => {
    const screenHandler = vi.fn();

    // Screen with a handler for 'x' to detect pass-through.
    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.boundKeyboard(['x'], screenHandler);
      }, [kb.boundKeyboard]);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';
    registerComponent(TestScreen, {});

    // Modal: allowModal('x') with when: () => false
    const modalHandler = vi.fn();
    function BlockingModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x'], { when: () => false });
      }, [kb.allowModal]);
      useEffect(() => {
        return kb.boundKeyboard(['a'], modalHandler);
      }, [kb.boundKeyboard]);
      return <Text>MODAL</Text>;
    }
    BlockingModal.displayName = 'BlockingModal';
    registerComponent(BlockingModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', BlockingModal, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // when returns false → 'x' stays blocked by the modal
    expect(screenHandler).not.toHaveBeenCalled();
  });

  test('no when option allows the key through', async () => {
    const screenHandler = vi.fn();

    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.boundKeyboard(['x'], screenHandler);
      }, [kb.boundKeyboard]);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';
    registerComponent(TestScreen, {});

    const modalHandler = vi.fn();
    function PassingModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x']); // no when → always allowed
      }, [kb.allowModal]);
      useEffect(() => {
        return kb.boundKeyboard(['a'], modalHandler);
      }, [kb.boundKeyboard]);
      return <Text>MODAL</Text>;
    }
    PassingModal.displayName = 'PassingModal';
    registerComponent(PassingModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', PassingModal, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // no when → 'x' passes through to the screen
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  
  test('when: () => true allows the key through', async () => {
    const screenHandler = vi.fn();

    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.boundKeyboard(['x'], screenHandler);
      }, [kb.boundKeyboard]);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';
    registerComponent(TestScreen, {});

    const modalHandler = vi.fn();
    function PassingModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x'], { when: () => true });
      }, [kb.allowModal]);
      useEffect(() => {
        return kb.boundKeyboard(['a'], modalHandler);
      }, [kb.boundKeyboard]);
      return <Text>MODAL</Text>;
    }
    PassingModal.displayName = 'PassingModal';
    registerComponent(PassingModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', PassingModal, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // when returns true → same as no when, passes through
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  test('when condition is evaluated per key press', async () => {
    const screenHandler = vi.fn();

    // toggleRef lets the when closure read the latest toggle state.
    const toggleRef = { current: false };

    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.boundKeyboard(['x'], screenHandler);
        // Press 't' to flip the toggle
      }, [kb.boundKeyboard]);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';
    registerComponent(TestScreen, {});

    const modalHandler = vi.fn();
    function DynamicModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x'], { when: () => toggleRef.current });
      }, [kb.allowModal]);
      useEffect(() => {
        return kb.boundKeyboard(['a'], modalHandler);
        // Press 't' inside the modal to toggle
      }, [kb.boundKeyboard]);
      return <Text>MODAL</Text>;
    }
    DynamicModal.displayName = 'DynamicModal';
    registerComponent(DynamicModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', DynamicModal, {});
    });
    await flush();
    await flush();

    // toggleRef.current is false → 'x' should NOT pass through
    await pressKey(stdin, 'x');
    expect(screenHandler).not.toHaveBeenCalled();

    // Flip toggle to true → now 'x' passes through
    toggleRef.current = true;
    await pressKey(stdin, 'x');
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });
});
