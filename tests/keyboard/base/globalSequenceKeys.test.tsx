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

describe('globalSequence', () => {
  test('raw handler fires when the full sequence is entered', () => {
    const handler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: handler
      }])
    })

    pressKey(stdin, 'a')
    expect(handler).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('when returns false — sequence does not start, keys fall through to screen', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: globalHandler,
        when: () => false
      }])
      kb.boundKeyboard(['a'], screenHandler)
    })

    pressKey(stdin, 'a')
    expect(screenHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).not.toHaveBeenCalled()
  })

  test('non-exclusive mode — mismatched key cancels pending and falls through to screen', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: globalHandler
      }])
      kb.boundKeyboard(['x'], screenHandler)
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'x')

    expect(globalHandler).not.toHaveBeenCalled()
    expect(screenHandler).toHaveBeenCalledTimes(1)
  })

  test('exclusive mode — mismatched key is consumed, sequence still completes', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: globalHandler,
        exclusive: true
      }])
      kb.boundKeyboard(['x'], screenHandler)
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'x')

    expect(screenHandler).not.toHaveBeenCalled()

    pressKey(stdin, 'b')
    expect(globalHandler).toHaveBeenCalledTimes(1)
  })

  test('two sequences sharing the same first key are disambiguated by the second key', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([
        { keys: ['a', 'b'], operate: handler1 },
        { keys: ['a', 'c'], operate: handler2 }
      ])
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).not.toHaveBeenCalled()

    pressKey(stdin, 'a')
    pressKey(stdin, 'c')
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  test('cover true — screen-level boundSequence overrides globalSequence', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: globalHandler
      }])
      kb.boundSequence(['a', 'b'], screenHandler)
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')

    expect(screenHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).not.toHaveBeenCalled()
  })

  test('cover false — globalSequence fires even when screen-level boundSequence exists', () => {
    const globalHandler = vi.fn()
    const screenHandler = vi.fn()
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundSequence(['a', 'b'], screenHandler)
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: globalHandler,
        cover: false
      }])
    })

    pressKey(stdin, 'a')
    pressKey(stdin, 'b')

    expect(globalHandler).toHaveBeenCalledTimes(1)
    expect(screenHandler).not.toHaveBeenCalled()
  })
})
