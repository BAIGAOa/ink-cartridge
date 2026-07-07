import { clearShortcutOperations } from "../../../src/keyboard/provider.js";
import { clearDispatchers } from "../../../src/screen/provider.js";
import { flush, Menu, pressKey, renderKeyboardApp, setupKeyboardTests } from "./_helpers.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import React, { useEffect } from "react";
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

describe('useModalMissListener', () => {
  test('unhandled key fires miss callback with miss: true', async () => {
    const onMiss = vi.fn()

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.useModalMissListener(onMiss)
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'x')
    expect(onMiss).toHaveBeenCalledTimes(1)
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true })
    )
  })

  test('handled key fires miss callback with miss: false', async () => {
    const onMiss = vi.fn()

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.boundKeyboard(['a'], vi.fn())
        kb.useModalMissListener(onMiss)
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'a')
    expect(onMiss).toHaveBeenCalledWith({ miss: false })
  })

  test('throws when called outside a modal', () => {
    let error: Error | null = null
    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.useModalMissListener(vi.fn())
      } catch (e) {
        error = e as Error
      }
    })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('modal')
  })

  test('monitorWhen — screen-level when-false binding treated as miss', async () => {
    const onMiss = vi.fn()
    let toggle = false

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.boundKeyboard(['x'], vi.fn(), { when: () => toggle })
        kb.useModalMissListener(onMiss, { monitorWhen: true })
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'x')
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true })
    )
  })

  test('monitorWhen — focus-target-level when-false binding treated as miss', async () => {
    const onMiss = vi.fn()
    let toggle = false

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.boundKeyboard(['x'], vi.fn(), { when: () => toggle, focusId: 'fa' })
        kb.focusSet('fa')
        kb.useModalMissListener(onMiss, { monitorWhen: true })
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'x')
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true })
    )
  })

  test('monitorFocusMismatch — key matching inactive focus target treated as miss', async () => {
    const onMiss = vi.fn()

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.boundKeyboard(['x'], vi.fn(), { focusId: 'fa' })
        kb.boundKeyboard(['y'], vi.fn(), { focusId: 'fb' })
        kb.focusSet('fa')
        kb.useModalMissListener(onMiss, { monitorFocusMismatch: true })
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'y')
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true })
    )
  })

  test('monitorFocusMismatch — no inactive target matches, still reports miss', async () => {
    const onMiss = vi.fn()

    function TestModal() {
      const kb = useKeyboard()
      useEffect(() => {
        kb.boundKeyboard(['x'], vi.fn(), { focusId: 'fa' })
        kb.boundKeyboard(['y'], vi.fn(), { focusId: 'fb' })
        kb.focusSet('fa')
        kb.useModalMissListener(onMiss, { monitorFocusMismatch: true })
      }, [])
      return <Text>Modal</Text>
    }
    TestModal.displayName = 'TestModal'
    registerComponent(TestModal, {})

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      sc.openModal('m', TestModal, {})
    })
    await flush()
    await flush()

    await pressKey(stdin, 'z')
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true })
    )
  })
})
