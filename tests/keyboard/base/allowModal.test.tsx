import { clearShortcutOperations } from "../../../src/keyboard/provider.js";
import { clearDispatchers } from "../../../src/screen/provider.js";
import { flush, Menu, pressKey, renderKeyboardApp, setupKeyboardTests } from "./_helpers.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import React, { act, useEffect } from "react";
import { Text } from "ink";
import { registerComponent } from "../../../src/screen/registry.js";
import { useKeyboard } from "../../../src/keyboard/hook.js";

beforeEach(() => {
  setupKeyboardTests()
})

afterEach(() => {
  vi.restoreAllMocks();
  clearShortcutOperations();
  clearDispatchers();
})

describe('allowModal', () => {
  test('allowed key passes through the modal to global keys', async () => {
    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.allowModal(['x'])
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const globalHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
      kb.globalKeys([{ key: 'x', operate: globalHandler }])
    })
    await flush()
    await flush()

    await pressKey(stdin, 'x')
    expect(globalHandler).toHaveBeenCalledTimes(1)
  })

  test('unallowed key is blocked by the modal', async () => {
    function TestModal() {
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const globalHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
      kb.globalKeys([{ key: 'y', operate: globalHandler }])
    })
    await flush()

    await pressKey(stdin, 'y')
    expect(globalHandler).not.toHaveBeenCalled()
  })

  test('throws when called outside a modal', () => {
    let error: Error | null = null
    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.allowModal(['x'])
      } catch (e) {
        error = e as Error
      }
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('modal')
  })
})
