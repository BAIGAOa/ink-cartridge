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

describe('sequence action', () => {
  test('defineSequenceAction with preset keys triggers via boundSequence(actionId)', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'seq-1',
        action: handler,
        keys: ['a', 'b']
      }])

      kb.boundSequence('seq-1')
    })

    pressKey(stdin, 'a')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('defineSequenceAction with empty array does not throw', () => {
    let threw = false

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.defineSequenceAction([])
      } catch {
        threw = true
      }
    })

    expect(threw).toBe(false)
  })

  test('defineSequenceAction rejects duplicate sequenceActionId', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'dup-seq',
        action: vi.fn(),
        keys: ['a', 'b']
      }])

      try {
        kb.defineSequenceAction([{
          sequenceActionId: 'dup-seq',
          action: vi.fn(),
          keys: ['c', 'd']
        }])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('dup-seq')
  })

  test('defineSequenceAction without keys can be referenced by globalSequence operate string', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'gs-target',
        action: handler
      }])

      kb.globalSequence([{
        keys: ['x', 'y'],
        operate: 'gs-target'
      }])
    })

    pressKey(stdin, 'x')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'y')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('addSequenceAction registers and works with boundSequence', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addSequenceAction({
        sequenceActionId: 'added-seq',
        action: handler,
        keys: ['m', 'n']
      })

      kb.boundSequence('added-seq')
    })

    pressKey(stdin, 'm')
    pressKey(stdin, 'n')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('addSequenceAction rejects duplicate sequenceActionId', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.addSequenceAction({
        sequenceActionId: 'dup-add',
        action: vi.fn(),
        keys: ['a', 'b']
      })

      try {
        kb.addSequenceAction({
          sequenceActionId: 'dup-add',
          action: vi.fn(),
          keys: ['c', 'd']
        })
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('dup-add')
  })

  test('hasSequenceAction returns true for registered action', () => {
    let result = false

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'has-test',
        action: vi.fn()
      }])

      result = kb.hasSequenceAction('has-test')
    })

    expect(result).toBe(true)
  })

  test('hasSequenceAction returns false for unregistered action', () => {
    let result = true

    renderKeyboardApp(Menu, (kb) => {
      result = kb.hasSequenceAction('no-such')
    })

    expect(result).toBe(false)
  })

  test('hasSequenceAction returns false after removeSequenceAction', () => {
    let before = false
    let after = true

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'to-remove',
        action: vi.fn()
      }])

      before = kb.hasSequenceAction('to-remove')
      kb.removeSequenceAction('to-remove')
      after = kb.hasSequenceAction('to-remove')
    })

    expect(before).toBe(true)
    expect(after).toBe(false)
  })

  test('removeSequenceAction successfully removes a registered action', () => {
    let existsAfterRemove = true

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'rm-me',
        action: vi.fn(),
        keys: ['a', 'b']
      }])

      kb.removeSequenceAction('rm-me')
      existsAfterRemove = kb.hasSequenceAction('rm-me')
    })

    expect(existsAfterRemove).toBe(false)
  })

  test('removeSequenceAction throws when action is not registered', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.removeSequenceAction('ghost')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('ghost')
  })

  test('modifySequenceAction changes keys — new keys work, old keys do not', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'mod-keys',
        action: handler,
        keys: ['a', 'b']
      }])

      kb.modifySequenceAction('mod-keys', ['c', 'd'])
      kb.boundSequence('mod-keys')
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'c')
    pressKey(stdin, 'd')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('modifySequenceAction changes timeout without breaking the action', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'mod-timeout',
        action: handler,
        keys: ['a', 'b'],
        timeout: 500
      }])

      kb.modifySequenceAction('mod-timeout', ['a', 'b'], 1000)
      kb.boundSequence('mod-timeout')
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('modifySequenceAction throws when action is not registered', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.modifySequenceAction('ghost', ['x', 'y'])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('ghost')
  })

  test('modifySequenceAction throws when action has no keys field', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'no-keys',
        action: vi.fn()
      }])

      try {
        kb.modifySequenceAction('no-keys', ['x', 'y'])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('Keys')
  })

  test('modifySequenceAction throws when modifying timeout on action without default timeout', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'no-default-timeout',
        action: vi.fn(),
        keys: ['a', 'b']
      }])

      try {
        kb.modifySequenceAction('no-default-timeout', ['c', 'd'], 500)
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('Timeout')
  })

  test('clearSequenceOperations removes all registered sequence actions', () => {
    let result = true

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'seq-a',
        action: vi.fn()
      }])
      kb.addSequenceAction({
        sequenceActionId: 'seq-b',
        action: vi.fn()
      })

      kb.clearSequenceOperations()

      result = kb.hasSequenceAction('seq-a')
    })

    expect(result).toBe(false)
  })

  test('boundSequence with actionId throws when action is not registered', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.boundSequence('no-such-action')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('no-such-action')
  })

  test('boundSequence with actionId throws when action has no preset keys', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'no-preset-keys',
        action: vi.fn()
      }])

      try {
        kb.boundSequence('no-preset-keys')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('keys')
  })

  test('globalSequence with operate string triggers the referenced sequence action', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([{
        sequenceActionId: 'gs-action',
        action: handler
      }])

      kb.globalSequence([{
        keys: ['p', 'q'],
        operate: 'gs-action'
      }])
    })

    pressKey(stdin, 'p')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'q')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('globalSequence throws when operate references an unregistered action', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.globalSequence([{
          keys: ['a', 'b'],
          operate: 'ghost-action'
        }])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('ghost-action')
  })

  test('globalSequence throws when keys length is less than 2', () => {
    let error: Error | null = null

    renderKeyboardApp(Menu, (kb) => {
      try {
        kb.globalSequence([{
          keys: ['a'],
          operate: vi.fn()
        }])
      } catch (e) {
        error = e as Error
      }
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('at least 2 keys')
  })

  test('globalSequence mode "add" allows both registrations to coexist', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([
        { sequenceActionId: 'gs-a', action: handlerA },
        { sequenceActionId: 'gs-b', action: handlerB }
      ])

      kb.globalSequence([{ keys: ['a', 'b'], operate: 'gs-a' }])
      kb.globalSequence([{ keys: ['c', 'd'], operate: 'gs-b' }], { mode: 'add' })
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')
    expect(handlerA).toHaveBeenCalledTimes(1)

    pressKey(stdin, 'c')
    pressKey(stdin, 'd')
    expect(handlerB).toHaveBeenCalledTimes(1)
  })

  test('globalSequence default mode replaces previous registrations', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([
        { sequenceActionId: 'old-gs', action: handlerA },
        { sequenceActionId: 'new-gs', action: handlerB }
      ])

      kb.globalSequence([{ keys: ['a', 'b'], operate: 'old-gs' }])
      kb.globalSequence([{ keys: ['c', 'd'], operate: 'new-gs' }])
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')
    expect(handlerA).not.toHaveBeenCalled()

    pressKey(stdin, 'c')
    pressKey(stdin, 'd')
    expect(handlerB).toHaveBeenCalledTimes(1)
  })
})
