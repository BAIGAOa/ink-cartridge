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

describe('base', () => {
  test('The shortcut key is bound and triggered normally', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler
      }])

      kb.boundKeyboard(['a'], 'action-1')
    })

    pressKey(stdin, 'a')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('The second calling method is that the shortcut key comes with keys.', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler,
        keys: ['a']
      }])

      kb.boundKeyboard('action-1')
    })

    pressKey(stdin, 'a')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('Repeated registration of shortcut keys should report an error', () => {
    const handler = vi.fn()

    const {} = renderKeyboardApp(Menu, (kb) => {
      
    })
  })

})
