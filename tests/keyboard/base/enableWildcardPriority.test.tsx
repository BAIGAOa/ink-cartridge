import { clearShortcutOperations } from "../../../src/keyboard/provider.js";
import { clearDispatchers } from "../../../src/screen/provider.js";
import { Menu, pressKey, renderKeyboardApp, setupKeyboardTests } from "./_helpers.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  setupKeyboardTests()
})

afterEach(() => {
  vi.restoreAllMocks();
  clearShortcutOperations();
  clearDispatchers();
})

describe('enableWildcardPriority', () => {
  test('with priority enabled, wildcard binding fires before exact binding', () => {
    const wildcardHandler = vi.fn()
    const exactHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.enableWildcardPriority()
      kb.boundKeyboard(['*'], wildcardHandler)
      kb.boundKeyboard(['a'], exactHandler)
    })

    pressKey(stdin, 'a')
    expect(wildcardHandler).toHaveBeenCalledTimes(1)
    expect(exactHandler).not.toHaveBeenCalled()
  })

  test('after disable, exact binding fires before wildcard', () => {
    const wildcardHandler = vi.fn()
    const exactHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const disable = kb.enableWildcardPriority()
      disable()
      kb.boundKeyboard(['*'], wildcardHandler)
      kb.boundKeyboard(['a'], exactHandler)
    })

    pressKey(stdin, 'a')
    expect(exactHandler).toHaveBeenCalledTimes(1)
    expect(wildcardHandler).not.toHaveBeenCalled()
  })

  test('wildcard still fires for keys without exact bindings', () => {
    const wildcardHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['*'], wildcardHandler)
      kb.boundKeyboard(['a'], vi.fn())
    })

    pressKey(stdin, 'z')
    expect(wildcardHandler).toHaveBeenCalledTimes(1)
  })
})
