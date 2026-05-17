import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useRef, useEffect, ReactNode } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import type { Key } from 'ink';

// ── Mock ink useInput ──────────────────────────────────────

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

/** 手动触发键盘事件 */
function pressKey(input: string, key: Partial<Key>) {
  if (!capturedInputHandler) throw new Error('useInput handler not captured');
  capturedInputHandler(input, {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    return: false,
    escape: false,
    backspace: false,
    delete: false,
    tab: false,
    space: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    insert: false,
    ctrl: false,
    shift: false,
    meta: false,
    numLock: false,
    ...key,
  } as Key);
}

// ── 测试用组件 ────────────────────────────────────────────

function Menu({ }: {}) {
  return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

function GameLevel({ level }: { level: number }) {
  return React.createElement('div', null, String(level));
}
GameLevel.displayName = 'GameLevel';

function Combat({ enemy }: { enemy: string }) {
  return React.createElement('div', null, enemy);
}
Combat.displayName = 'Combat';

function Notification({ message }: { message: string }) {
  return React.createElement('div', null, message);
}
Notification.displayName = 'Notification';

// ── Setup ─────────────────────────────────────────────────

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;
  registerComponent(Menu, {});
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });
  registerComponent(Notification, { message: '' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 辅助 ──────────────────────────────────────────────────

/** 渲染完整 Provider 栈 + 回调收集 ref */
function renderKeyboardTree(
  defaultScreen: React.ComponentType<any>,
): {
  /** 获取最新 KeyboardContext */
  getKeyboard: () => ReturnType<typeof useKeyboard> | null;
  /** 获取最新 ScreenContext */
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
    return React.createElement('div', null);
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

// ── 测试：正常化按键名 ────────────────────────────────────

describe('按键名标准化', () => {
  it('useInput 在 KeyboardProvider 挂载后被捕获', () => {
    renderKeyboardTree(Menu);
    expect(capturedInputHandler).not.toBeNull();
  });

  it('ctrl+s 会被捕获为 ctrl+s', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['ctrl+s'], cb);

    pressKey('s', { ctrl: true });
    expect(cb).toHaveBeenCalledWith('s', expect.objectContaining({ ctrl: true }));
  });

  it('return 键被正确识别', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['return'], cb);

    pressKey('', { return: true });
    expect(cb).toHaveBeenCalled();
  });

  it('escape 键被正确识别', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['escape'], cb);

    pressKey('', { escape: true });
    expect(cb).toHaveBeenCalled();
  });

  it('shift+tab 被正确识别', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['shift+tab'], cb);

    pressKey('', { tab: true, shift: true });
    expect(cb).toHaveBeenCalled();
  });
});

// ── 测试：boundKeyboard ───────────────────────────────────

describe('boundKeyboard', () => {
  it('绑定单键回调，按键时触发', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['s'], cb);

    pressKey('s', {});
    expect(cb).toHaveBeenCalledWith('s', expect.any(Object));
  });

  it('多键绑定同一回调', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['a', 'b', 'c'], cb);

    pressKey('a', {});
    expect(cb).toHaveBeenCalledTimes(1);
    pressKey('b', {});
    expect(cb).toHaveBeenCalledTimes(2);
    pressKey('c', {});
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('返回的解绑函数可取消绑定', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    const unbind = getKeyboard()!.boundKeyboard(['x'], cb);

    unbind();
    pressKey('x', {});
    expect(cb).not.toHaveBeenCalled();
  });
});

// ── 测试：责任链冒泡 ──────────────────────────────────────

describe('责任链冒泡（栈顶 → 栈底）', () => {
  it('栈顶处理了，底层不触发', () => {
    const menuCb = vi.fn();
    const combatCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    // Menu 绑定 'e'（全局退出）
    getKeyboard()!.boundKeyboard(['e'], menuCb);

    // 进入 Combat
    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));

    // Combat 也绑定 'e'（覆盖本层）
    getKeyboard()!.boundKeyboard(['e'], combatCb);

    pressKey('e', {});
    expect(combatCb).toHaveBeenCalledTimes(1);
    expect(menuCb).not.toHaveBeenCalled();
  });

  it('栈顶未处理，冒泡到下层', () => {
    const menuCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    // Menu 绑定 'e'
    getKeyboard()!.boundKeyboard(['e'], menuCb);

    // 进入 Combat（不绑定 'e'）
    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));

    pressKey('e', {});
    expect(menuCb).toHaveBeenCalledTimes(1);
  });

  it('所有层都未处理则丢弃', () => {
    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));

    // 无任何绑定，按 'z' 不崩溃
    expect(() => pressKey('z', {})).not.toThrow();
  });
});

// ── 测试：blockedKey ──────────────────────────────────────

describe('blockedKey', () => {
  it('屏蔽的键在本层穿透，下层可处理', () => {
    const menuCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    // Menu 绑定 'e'（全局退出）
    getKeyboard()!.boundKeyboard(['e'], menuCb);

    // 进入 Combat
    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));

    // Combat 屏蔽 'e'：让 'e' 穿透到 Menu
    getKeyboard()!.blockedKey(['e']);

    pressKey('e', {});
    // Menu 的绑定被触发（因为 Combat 的 blockedKey 让它穿透）
    expect(menuCb).toHaveBeenCalledTimes(1);
  });

  it('blockedKey 不影响其他键', () => {
    const cb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));

    getKeyboard()!.blockedKey(['e']);
    getKeyboard()!.boundKeyboard(['s'], cb);

    pressKey('s', {});
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('blockedKey 只对本层生效', () => {
    const menuCb = vi.fn();
    const gameCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    // Menu 绑定 'e'
    getKeyboard()!.boundKeyboard(['e'], menuCb);

    // 进入 GameLevel
    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    getKeyboard()!.boundKeyboard(['e'], gameCb);

    // 进入 Combat（不屏蔽 'e'）
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));
    // Combat 不绑定也不屏蔽 'e'

    // GameLevel 的 'e' 还在生效
    // 但 Combat 在栈顶，没绑定 → 冒泡到 GameLevel
    pressKey('e', {});
    expect(gameCb).toHaveBeenCalledTimes(1);
    expect(menuCb).not.toHaveBeenCalled(); // GameLevel 处理了，不到 Menu
  });
});

// ── 测试：onlyThis ────────────────────────────────────────

describe('onlyThis', () => {
  it('onlyThis=true 只在栈顶时激活', () => {
    const combatCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));
    getKeyboard()!.boundKeyboard(['a'], combatCb, { onlyThis: true });

    // Combat 是栈顶 → 激活
    pressKey('a', {});
    expect(combatCb).toHaveBeenCalledTimes(1);

    // 在 Combat 之上打开 overlay → Combat 不再是栈顶
    act(() => getScreen()!.overlay(Notification, { message: 'test' }));
    combatCb.mockClear();
    pressKey('a', {});
    // Notification 没有绑 'a' → 穿透到 Combat，但 Combat 非栈顶 → 跳过
    // 再穿透到 GameLevel（没绑） → Menu（没绑） → 丢弃
    expect(combatCb).not.toHaveBeenCalled();
  });
});

// ── 测试：Overlay 优先级 ──────────────────────────────────

describe('Overlay 优先级', () => {
  it('overlay 的绑定优先于屏幕栈', () => {
    const screenCb = vi.fn();
    const overlayCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    // 打开 overlay
    act(() => getScreen()!.overlay(Notification, { message: 'test' }));
    getKeyboard()!.boundKeyboard(['escape'], overlayCb);

    // Menu 也绑定 escape
    getKeyboard()!.boundKeyboard(['escape'], screenCb);

    pressKey('', { escape: true });
    expect(overlayCb).toHaveBeenCalledTimes(1);
    expect(screenCb).not.toHaveBeenCalled();
  });

  it('overlay 未处理时冒泡到屏幕栈', () => {
    const menuCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    getKeyboard()!.boundKeyboard(['e'], menuCb);

    // 打开 overlay（不绑定任何键）
    act(() => getScreen()!.overlay(Notification, { message: 'test' }));

    pressKey('e', {});
    expect(menuCb).toHaveBeenCalledTimes(1);
  });
});

// ── 测试：层清理 ──────────────────────────────────────────

describe('层生命周期', () => {
  it('离开路径后层被清理，绑定不再生效', () => {
    const combatCb = vi.fn();

    const { getKeyboard, getScreen } = renderKeyboardTree(Menu);

    act(() => getScreen()!.skip(GameLevel, { level: 1 }));
    act(() => getScreen()!.skip(Combat, { enemy: 'goblin' }));
    getKeyboard()!.boundKeyboard(['a'], combatCb);

    // 返回 GameLevel
    act(() => getScreen()!.back());
    combatCb.mockClear();

    pressKey('a', {});
    expect(combatCb).not.toHaveBeenCalled();
  });
});

// ── 测试：修饰键组合 ──────────────────────────────────────

describe('修饰键组合', () => {
  it('ctrl+字符被正确匹配', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['ctrl+d'], cb);

    pressKey('d', { ctrl: true });
    expect(cb).toHaveBeenCalled();
  });

  it('meta+字符被正确匹配', () => {
    const cb = vi.fn();
    const { getKeyboard } = renderKeyboardTree(Menu);
    getKeyboard()!.boundKeyboard(['meta+f'], cb);

    pressKey('f', { meta: true });
    expect(cb).toHaveBeenCalled();
  });
});