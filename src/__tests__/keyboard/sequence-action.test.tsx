import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import type { Key } from 'ink';

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

function Menu() {
  return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
} {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function Spy() {
    const kb = useKeyboard();
    useEffect(() => {
      kbRef.current = kb;
    }, [kb]);
    return React.createElement(CurrentScreen);
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
  };
}

describe('defineSequenceAction', () => {
  it('defineSequenceAction 批量注册多个 sequence action', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action1 = vi.fn();
    const action2 = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'act1', action: action1, keys: ['a', 'b'] },
      { sequenceActionId: 'act2', action: action2, keys: ['c', 'd'], timeout: 800 },
    ]);

    expect(getKeyboard()!.hasSequenceAction('act1')).toBe(true);
    expect(getKeyboard()!.hasSequenceAction('act2')).toBe(true);
    expect(getKeyboard()!.hasSequenceAction('nonexistent')).toBe(false);
  });

  it('defineSequenceAction 重复 sequenceActionId 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'dup', action: () => {} },
    ]);

    expect(() =>
      getKeyboard()!.defineSequenceAction([
        { sequenceActionId: 'dup', action: () => {} },
      ]),
    ).toThrow('may not be defined repeatedly');
  });

  it('defineSequenceAction 在同一批次内重复 ID 也抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    expect(() =>
      getKeyboard()!.defineSequenceAction([
        { sequenceActionId: 'same', action: () => {}, keys: ['a', 'b'] },
        { sequenceActionId: 'same', action: () => {}, keys: ['x', 'y'] },
      ]),
    ).toThrow('may not be defined repeatedly');
  });
});

describe('modifySequenceAction', () => {
  it('modifySequenceAction 动态修改已注册 action 的 keys', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'modMe', action, keys: ['a', 'b'] },
    ]);

    getKeyboard()!.modifySequenceAction('modMe', ['x', 'y']);

    // 验证修改后的预期：用新 keys 通过 globalSequence 引用该 action
    getKeyboard()!.globalSequence([
      { keys: ['x', 'y'], operate: 'modMe' },
    ]);

    pressKey('x', {});
    pressKey('y', {});
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('modifySequenceAction 修改不存在的 action 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    expect(() =>
      getKeyboard()!.modifySequenceAction('noSuchAction', ['a', 'b']),
    ).toThrow('Key not registered to Sequence Action cannot be modified');
  });

  it('modifySequenceAction 修改没有预设 keys 的 action 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'noKeys',
      action: () => {},
      // 没有 keys
    });

    expect(() =>
      getKeyboard()!.modifySequenceAction('noKeys', ['a', 'b']),
    ).toThrow('has no preset Keys');
  });

  it('modifySequenceAction 同时修改 keys 和 timeout', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'modTimeout', action, keys: ['a', 'b'], timeout: 500 },
    ]);

    getKeyboard()!.modifySequenceAction('modTimeout', ['m', 'n'], 2000);

    // 验证：用新 keys 引用，timeout 已更新
    getKeyboard()!.globalSequence([
      { keys: ['m', 'n'], operate: 'modTimeout' },
    ]);

    pressKey('m', {});
    pressKey('n', {});
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('modifySequenceAction 对没有预设 timeout 的 action 修改 timeout 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'noTimeout',
      action: () => {},
      keys: ['a', 'b'],
      // 没有 timeout
    });

    expect(() =>
      getKeyboard()!.modifySequenceAction('noTimeout', ['x', 'y'], 1000),
    ).toThrow('has no default Timeout');
  });
});

describe('addSequenceAction 和 hasSequenceAction', () => {
  it('addSequenceAction 注册后 hasSequenceAction 返回 true', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'mySeq',
      action,
      keys: ['a', 'b'],
    });

    expect(getKeyboard()!.hasSequenceAction('mySeq')).toBe(true);
    expect(getKeyboard()!.hasSequenceAction('nonexistent')).toBe(false);
  });

  it('addSequenceAction 重复 sequenceActionId 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'dup',
      action: () => {},
    });

    expect(() =>
      getKeyboard()!.addSequenceAction({
        sequenceActionId: 'dup',
        action: () => {},
      }),
    ).toThrow();
  });
});

describe('removeSequenceAction 和 clearSequenceOperations', () => {
  it('removeSequenceAction 移除已注册的 action', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'toRemove',
      action: () => {},
    });
    expect(getKeyboard()!.hasSequenceAction('toRemove')).toBe(true);

    getKeyboard()!.removeSequenceAction('toRemove');
    expect(getKeyboard()!.hasSequenceAction('toRemove')).toBe(false);
  });

  it('removeSequenceAction 对不存在的 ID 抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    expect(() =>
      getKeyboard()!.removeSequenceAction('unknownId'),
    ).toThrow('action not registered');
  });

  it('clearSequenceOperations 清除所有注册的 sequence action', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'seq1',
      action: () => {},
    });
    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'seq2',
      action: () => {},
    });
    expect(getKeyboard()!.hasSequenceAction('seq1')).toBe(true);
    expect(getKeyboard()!.hasSequenceAction('seq2')).toBe(true);

    getKeyboard()!.clearSequenceOperations();

    expect(getKeyboard()!.hasSequenceAction('seq1')).toBe(false);
    expect(getKeyboard()!.hasSequenceAction('seq2')).toBe(false);
  });
});

describe('globalSequence 集成 Sequence Action', () => {
  it('globalSequence 通过 operate 字符串引用 action 并执行', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'openMenu', action, keys: ['o', 'm'] },
    ]);

    // 使用字符串 operate 引用已注册的 action
    getKeyboard()!.globalSequence([
      { keys: ['o', 'm'], operate: 'openMenu' },
    ]);

    pressKey('o', {});
    pressKey('m', {});
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('globalSequence operate 引用未注册的 action 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    expect(() =>
      getKeyboard()!.globalSequence([
        { keys: ['a', 'b'], operate: 'notRegistered' },
      ]),
    ).toThrow();
  });
});

describe('boundSequence 集成 Sequence Action', () => {
  it('boundSequence(actionId) 使用 action 预设的 keys 并执行', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'quickSave', action, keys: ['q', 's'] },
    ]);

    // 使用 actionId 字符串调用，而非显式 keys
    getKeyboard()!.boundSequence('quickSave');

    pressKey('q', {});
    pressKey('s', {});
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('boundSequence(actionId) 引用未注册的 action 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    expect(() =>
      getKeyboard()!.boundSequence('notRegistered'),
    ).toThrow();
  });

  it('boundSequence(actionId) action 没有预设 keys 时抛错', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);

    getKeyboard()!.addSequenceAction({
      sequenceActionId: 'noKeysAction',
      action: () => {},
      // 没有 keys
    });

    expect(() =>
      getKeyboard()!.boundSequence('noKeysAction'),
    ).toThrow();
  });

  it('boundSequence(actionId, options) 使用预设 keys 并应用额外选项', () => {
    const { getKeyboard } = renderKeyboardTree(Menu);
    const action = vi.fn();

    getKeyboard()!.defineSequenceAction([
      { sequenceActionId: 'boost', action, keys: ['b', 'o'], timeout: 1000 },
    ]);

    // 传入 actionId + options，使用预设 timeout=1000
    getKeyboard()!.boundSequence('boost', { exclusive: true });

    // 非匹配键在 exclusive 模式下被无声消费
    pressKey('b', {});
    pressKey('x', {});
    pressKey('o', {});
    expect(action).toHaveBeenCalledTimes(1);
  });
});
