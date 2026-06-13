import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { CurrentScreen } from '../../screen/current-screen.js';
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

function pressKey(input: string, key: Partial<Key>) {
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

function GameLevel({ level }: { level: number }) {
  return React.createElement('div', null, String(level));
}
GameLevel.displayName = 'GameLevel';

function Notification({ message }: { message: string }) {
  return React.createElement('div', null, message);
}
Notification.displayName = 'Notification';

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Notification, { message: '' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

import { KeyboardProvider } from '../../keyboard/provider.js';
import { useScreenSystem } from '../../screen/hook.js';

function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
  getScreen: () => ReturnType<typeof useScreenSystem> | null;
} {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };
  const scRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };

  function Spy() {
    const kb = useKeyboard();
    const sc = useScreenSystem();
    kbRef.current = kb;
    scRef.current = sc;
    useEffect(() => {
      kbRef.current = kb;
      scRef.current = sc;
    }, [kb, sc]);
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
    getScreen: () => scRef.current,
  };
}

describe('enableWildcardPriority', () => {
  it('开启通配符优先后，通配符在精确键名之前匹配', () => {
    const wildcardCb = vi.fn();
    const exactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['x'], exactCb);

    pressKey('x', {});

    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).not.toHaveBeenCalled();

    disable();
  });

  it('默认行为：精确键名先于通配符匹配', () => {
    const wildcardCb = vi.fn();
    const exactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['x'], exactCb);

    pressKey('x', {});

    expect(exactCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();
  });

  it('切换：开启→关闭→再开启', () => {
    const wildcardCb = vi.fn();
    const exactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['x'], exactCb);

    // 默认：精确胜
    pressKey('x', {});
    expect(exactCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).toHaveBeenCalledTimes(0);

    // 开启：通配符胜
    exactCb.mockClear();
    const disable = kb.enableWildcardPriority();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).toHaveBeenCalledTimes(0);

    // 关闭：精确又胜
    wildcardCb.mockClear();
    exactCb.mockClear();
    disable();
    pressKey('x', {});
    expect(exactCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).toHaveBeenCalledTimes(0);

    // 再开启：通配符又胜
    exactCb.mockClear();
    wildcardCb.mockClear();
    const disable2 = kb.enableWildcardPriority();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).toHaveBeenCalledTimes(0);

    disable2();
  });

  it('特殊键 return 在通配符优先模式下仍不被通配符匹配', () => {
    const wildcardCb = vi.fn();
    const returnCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['return'], returnCb);

    pressKey('', { return: true });

    expect(returnCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('特殊键 escape 在通配符优先模式下仍不被通配符匹配', () => {
    const wildcardCb = vi.fn();
    const escapeCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['escape'], escapeCb);

    pressKey('', { escape: true });

    expect(escapeCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('方向键在通配符优先模式下仍不被通配符匹配', () => {
    const wildcardCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);

    pressKey('', { upArrow: true });

    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('Tab 在通配符优先模式下仍正常工作（不被通配符拦截）', () => {
    const wildcardCb = vi.fn();
    const tabCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    // 注册两个 focus target 不触发内置 tab 导航，而是测试 tab 绑定
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['tab'], tabCb);

    pressKey('', { tab: true });

    expect(tabCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('backspace 在通配符优先模式下仍不被通配符匹配', () => {
    const wildcardCb = vi.fn();
    const bsCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['backspace'], bsCb);

    pressKey('', { backspace: true });

    expect(bsCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('Ctrl+字符组合在通配符优先模式下不受影响', () => {
    const wildcardCb = vi.fn();
    const ctrlCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['ctrl+s'], ctrlCb);

    pressKey('s', { ctrl: true });

    expect(ctrlCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();

    disable();
  });

  it('开启通配符优先后，sequence 被通配符打断（不启动序列）', () => {
    const wildcardCb = vi.fn();
    const sequenceCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundSequence(['g', 'g'], sequenceCb);

    // 按 g → 通配符直接捕获，不会启动序列
    pressKey('g', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(sequenceCb).not.toHaveBeenCalled();

    // 再按 g → 通配符再次捕获，序列从未启动
    pressKey('g', {});
    expect(wildcardCb).toHaveBeenCalledTimes(2);
    expect(sequenceCb).not.toHaveBeenCalled();

    disable();
  });

  it('关闭通配符优先后，sequence 恢复正常工作', () => {
    const wildcardCb = vi.fn();
    const sequenceCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundSequence(['g', 'g'], sequenceCb);

    // 开启时：通配符捕获
    pressKey('g', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);

    // 关闭
    disable();
    wildcardCb.mockClear();

    // 关闭后：精确键名匹配（wildcard 在默认模式下最后匹配）
    // g 没有精确匹配，会命中 wildcard（但 exact 优先...实际上没有 exact 绑定 'g'）
    // 实际上在没有精确匹配 'g' 的情况下，wildcard 还是会匹配 'g'
    // 但 sequence 会先启动。所以当 sequence 存在时，第一个 'g' 启动序列
    // 让我们测试完整序列
    pressKey('g', {});
    // 第一个 g 启动了序列（不是 wildcard，因为无 focus target 时 screen-level tryMatchBindings 中 wildcard 最后）
    // 但这里没有其他 exact 绑定也匹配 g，所以...
    // 实际行为：第一个 g → 启动 sequence（因为 sequence 在 tryMatchBindings 之前）
    // 所以 wildcard 不会被触发，sequence 也不会（还没完成）
    pressKey('g', {});
    expect(sequenceCb).toHaveBeenCalledTimes(1);
  });

  it('引用计数：多个调用者独立开关', () => {
    const wildcardCb = vi.fn();
    const exactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['x'], exactCb);

    // A 开启
    const disableA = kb.enableWildcardPriority();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).not.toHaveBeenCalled();

    // B 开启
    wildcardCb.mockClear();
    const disableB = kb.enableWildcardPriority();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).not.toHaveBeenCalled();

    // A 关闭（B 仍开启，通配符仍优先）
    wildcardCb.mockClear();
    disableA();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);
    expect(exactCb).not.toHaveBeenCalled();

    // B 关闭（计数归零，恢复默认）
    wildcardCb.mockClear();
    disableB();
    pressKey('x', {});
    expect(exactCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();
  });

  it('重复调用 disable 函数不影响计数', () => {
    const wildcardCb = vi.fn();
    const exactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    kb.boundKeyboard(['*'], wildcardCb);
    kb.boundKeyboard(['x'], exactCb);

    const disable = kb.enableWildcardPriority();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);

    // 重复 disable
    disable();
    disable();
    disable();

    // 恢复默认
    wildcardCb.mockClear();
    pressKey('x', {});
    expect(exactCb).toHaveBeenCalledTimes(1);
    expect(wildcardCb).not.toHaveBeenCalled();
  });

  it('聚焦目标的通配符优先于屏幕级精确绑定', () => {
    const focusWildcardCb = vi.fn();
    const screenExactCb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();

    // focus target 注册通配符
    kb.boundKeyboard(['*'], focusWildcardCb, { focusId: 'input' });
    // 屏幕级注册精确键
    kb.boundKeyboard(['a'], screenExactCb);

    pressKey('a', {});

    // 聚焦目标的通配符优先于屏幕级精确绑定
    expect(focusWildcardCb).toHaveBeenCalledTimes(1);
    expect(screenExactCb).not.toHaveBeenCalled();

    disable();
  });

  it('通配符优先模式下 onlyThis 语义仍然生效', () => {
    const wildcardCb = vi.fn();
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    const kb = getKeyboard()!;
    const disable = kb.enableWildcardPriority();

    // 注册 onlyThis 通配符绑定
    kb.boundKeyboard(['*'], wildcardCb, { onlyThis: true });

    // 无 overlay 时正常触发
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);

    // 打开 overlay → onlyThis 阻止匹配
    wildcardCb.mockClear();
    act(() => getScreen()!.openOverlay('test-ovl', Notification, { message: 'test' }));
    pressKey('x', {});
    // 通配符被 onlyThis 阻止，overlay 上没有绑定来处理 x
    // 所以 x 应该被丢弃（没有人处理它）
    expect(wildcardCb).not.toHaveBeenCalled();

    // 关闭 overlay → 恢复
    act(() => getScreen()!.closeOverlay('test-ovl'));
    wildcardCb.mockClear();
    pressKey('x', {});
    expect(wildcardCb).toHaveBeenCalledTimes(1);

    disable();
  });
});
