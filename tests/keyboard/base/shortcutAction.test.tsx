import { clearShortcutOperations } from "../../../src/keyboard/provider.js";
import { clearDispatchers } from "../../../src/screen/provider.js";
import { flush, Menu, pressKey, renderKeyboardApp, setupKeyboardTests } from "./_helpers.js";
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
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler,
      }])

      try {
        kb.defineShortcutAction([{
          actionId: 'action-1',
          action: vi.fn(),
        }])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('Duplicate shortcut cannot be defined with ID action-1')
  })

  test('addAction should also reject duplicate action IDs', () => {
    const handler = vi.fn()
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.addAction({
        actionId: 'action-2',
        action: handler,
      })

      try {
        kb.addAction({
          actionId: 'action-2',
          action: vi.fn(),
        })
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('Duplicate shortcut cannot be defined with ID action-2')
  })

  
  test('Runtime capabilities of addAction', () => {
    const handler = vi.fn()

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([])
      kb.addAction({
        action: handler,
        actionId: 'action-1'
      })

      kb.boundKeyboard(['a'], 'action-1')
    })

    pressKey(stdin, 'a')

    expect(handler).toHaveBeenCalledTimes(1)
  })


  test('HasAction normally returns true or false', () => {
    const handler = vi.fn()

    let haveAction = false
    let haveNoAction = false

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        {
          action: handler,
          actionId: 'action-1'
        }
      ])

      haveAction = kb.hasAction('action-1')
      haveNoAction = !kb.hasAction('action-2')
    })

    expect(haveAction).toBe(true)
    expect(haveNoAction).toBe(true)
  })

  test('HasAction returns false after deleting an Action', () => {
    const handler = vi.fn()

    let haveAction = false
    let noAction = false
    
    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        {
          action: handler,
          actionId: 'action-1'
        }
      ])

      haveAction = kb.hasAction('action-1')

      kb.removeAction('action-1')
      
      noAction = !kb.hasAction('action-1')
    })

    expect(haveAction).toBe(true)
    expect(noAction).toBe(true)
  })

  test('removeAction throws when the action is not registered', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.removeAction('non-existent')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('non-existent')
  })

  test('modifyAction changes the keys of an existing action', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler,
        keys: ['a']
      }])

      kb.modifyAction('action-1', ['b'])
      kb.boundKeyboard('action-1')
    })

    pressKey(stdin, 'a')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('modifyAction throws when action is not registered', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.modifyAction('ghost', ['z'])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('action not registered')
  })

  test('modifyAction throws when action has no keys field', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'no-keys',
        action: vi.fn()
      }])

      try {
        kb.modifyAction('no-keys', ['new-key'])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('keys')
  })

  test('clearShortcutOperations removes all registered actions', () => {
    let hasAfterClear = true

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: vi.fn()
      }])
      kb.addAction({
        actionId: 'action-2',
        action: vi.fn()
      })

      kb.clearShortcutOperations()

      hasAfterClear = kb.hasAction('action-1')
    })

    expect(hasAfterClear).toBe(false)
  })

  test('defineShortcutAction can register multiple actions at once', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        { actionId: 'action-a', action: handlerA },
        { actionId: 'action-b', action: handlerB }
      ])

      kb.boundKeyboard(['a'], 'action-a')
      kb.boundKeyboard(['b'], 'action-b')
    })

    pressKey(stdin, 'a')
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(1)
  })

  test('globalKeys can reference a shortcut action by actionId', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'global-action',
        action: handler
      }])

      kb.globalKeys([{
        key: 'g',
        operate: 'global-action'
      }])
    })

    pressKey(stdin, 'g')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('globalKeys throws when referencing an unregistered actionId', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.globalKeys([{
          key: 'g',
          operate: 'ghost'
        }])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('ghost')
  })

  test('boundKeyboard with actionId only binds at screen level', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler,
        keys: ['x']
      }])

      kb.boundKeyboard('action-1')
    })

    pressKey(stdin, 'x')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('boundKeyboard with a removed actionId throws', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: vi.fn()
      }])

      kb.removeAction('action-1')

      try {
        kb.boundKeyboard(['a'], 'action-1')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('action-1')
  })

  test('defineShortcutAction with an empty array does not throw', () => {
    let threw = false

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.defineShortcutAction([])
      } catch {
        threw = true
      }
    })

    expect(threw).toBe(false)
  })

  test('action registered without keys can be bound with explicit keys', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'action-1',
        action: handler
      }])

      kb.boundKeyboard(['z'], 'action-1')
    })

    pressKey(stdin, 'z')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('globalKeys mode "add" allows both registrations to coexist', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        { actionId: 'act-a', action: handlerA },
        { actionId: 'act-b', action: handlerB }
      ])

      kb.globalKeys([{ key: 'a', operate: 'act-a' }])
      kb.globalKeys([{ key: 'b', operate: 'act-b' }], { mode: 'add' })
    })

    pressKey(stdin, 'a')
    expect(handlerA).toHaveBeenCalledTimes(1)

    pressKey(stdin, 'b')
    expect(handlerB).toHaveBeenCalledTimes(1)
  })

  test('globalKeys default mode replaces previous registrations', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        { actionId: 'act-a', action: handlerA },
        { actionId: 'act-b', action: handlerB }
      ])

      kb.globalKeys([{ key: 'a', operate: 'act-a' }])
      kb.globalKeys([{ key: 'b', operate: 'act-b' }])
    })

    pressKey(stdin, 'a')
    expect(handlerA).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(handlerB).toHaveBeenCalledTimes(1)
  })

  test('globalKeys with cover false prevents screen-level boundKeyboard for the same key', () => {
    const globalHandler = vi.fn()
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'global-act',
        action: globalHandler,
      }])

      kb.globalKeys([{
        key: 'x',
        operate: 'global-act',
        cover: false
      }])

      try {
        kb.boundKeyboard(['x'], vi.fn())
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
  })

  test('globalKeys key array triggers the same action for all listed keys', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'multi-key',
        action: handler
      }])

      kb.globalKeys([{
        key: ['a', 'b', 'c'],
        operate: 'multi-key'
      }])
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')
    pressKey(stdin, 'c')

    expect(handler).toHaveBeenCalledTimes(3)
  })

  test('screen-level boundKeyboard overrides globalKeys with the same key when cover is true', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'global-act',
        action: globalHandler
      }])

      kb.globalKeys([{
        key: 's',
        operate: 'global-act',
      }])

      kb.boundKeyboard(['s'], screenHandler)
    })

    pressKey(stdin, 's')

    expect(screenHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).not.toHaveBeenCalled()
  })

  test('globalKeys with executeWhenNoOverlay fires even when no overlay is active', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([{
        actionId: 'overlay-act',
        action: handler
      }])

      kb.globalKeys([{
        key: 'o',
        operate: 'overlay-act',
        affectOverlay: true,
        executeWhenNoOverlay: true
      }])
    })

    pressKey(stdin, 'o')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
