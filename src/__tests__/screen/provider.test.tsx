import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useRef, useEffect, ReactNode } from 'react';
import {
  registerComponent,
  clearRegistry,
} from '../../screen/registry.js';
import {
  ScenarioManagementProvider,
  skip,
  back,
  gotoScreen,
  overlay,
  closeOverlay,
} from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
import { CurrentScreen } from '../../screen/current-screen.js';

// ── 测试用组件 ────────────────────────────────────────────

function Menu({ }: {}) {
  return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

function Settings({ theme }: { theme: string }) {
  return React.createElement('div', null, theme);
}
Settings.displayName = 'Settings';

function GameLevel({ level }: { level: number }) {
  return React.createElement('div', null, String(level));
}
GameLevel.displayName = 'GameLevel';

function Combat({ enemy }: { enemy: string }) {
  return React.createElement('div', null, enemy);
}
Combat.displayName = 'Combat';

function Inventory({ items }: { items: string[] }) {
  return React.createElement('div', null, String(items?.length ?? 0));
}
Inventory.displayName = 'Inventory';

function Notification({ message }: { message: string }) {
  return React.createElement('div', null, message);
}
Notification.displayName = 'Notification';

// ── 捕获消费者（用 useEffect 保证 commit 后更新）───────────

interface CapturedScreenSystem {
  currentScreen: ReactNode;
  currentOverlay: ReactNode | null;
  currentPath: React.ComponentType<any>[];
  skip: (comp: any, params: any, opts?: any) => void;
  back: () => void;
  gotoScreen: (comp: any, params: any) => void;
  overlay: (comp: any, params: any) => void;
  closeOverlay: () => void;
}

function CaptureConsumer({
  onCapture,
}: {
  onCapture: (v: CapturedScreenSystem) => void;
}) {
  const ctx = useScreenSystem();
  const ref = useRef(onCapture);
  ref.current = onCapture;

  useEffect(() => {
    ref.current(ctx);
  }, [ctx]);

  return React.createElement('div', null, 'capture');
}

// ── Setup ─────────────────────────────────────────────────

beforeEach(() => {
  clearRegistry();
  registerComponent(Menu, {});
  registerComponent(Settings, { theme: 'dark' }, { parent: Menu });
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });
  registerComponent(Inventory, { items: [] }, { parent: GameLevel });
  registerComponent(Notification, { message: '' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 辅助：从 DOM 读取渲染内容 ─────────────────────────────

/** 直接渲染 CurrentScreen，从 DOM 检查当前屏幕文字 */
function renderAndGetText(
  defaultScreen: React.ComponentType<any>,
  defaultParams?: Record<string, unknown>,
): string | null {
  const { container } = render(
    React.createElement(
      ScenarioManagementProvider,
      { defaultScreen, defaultParams },
      React.createElement(CurrentScreen),
    ),
  );
  return container.textContent;
}

// ── 辅助：渲染并用 ref 持有 hook 返回值 ────────────────────

function renderWithRef(
  defaultScreen: React.ComponentType<any>,
  defaultParams?: Record<string, unknown>,
): {
  get: () => CapturedScreenSystem | null;
  container: HTMLElement;
} {
  const ref: { current: CapturedScreenSystem | null } = { current: null };

  function Spy() {
    const ctx = useScreenSystem();
    ref.current = ctx;
    // 用 useEffect 确保每次渲染后都能更新 ref
    useEffect(() => {
      ref.current = ctx;
    }, [ctx]);
    return React.createElement(CurrentScreen);
  }

  const { container } = render(
    React.createElement(
      ScenarioManagementProvider,
      { defaultScreen, defaultParams },
      React.createElement(Spy),
    ),
  );

  return { get: () => ref.current, container };
}

// ── 测试 ──────────────────────────────────────────────────

describe('ScenarioManagementProvider（默认屏幕）', () => {
  it('使用 defaultScreen 渲染初始屏幕', () => {
    const text = renderAndGetText(Menu);
    expect(text).toContain('Menu');
  });

  it('defaultParams 传递到组件', () => {
    // 用一个会渲染 props 的组件来验证
    function Echo({ value }: { value: string }) {
      return React.createElement('div', null, value);
    }
    Echo.displayName = 'Echo';
    registerComponent(Echo, { value: '' }, { parent: Menu });

    const { get } = renderWithRef(Menu);
    act(() => get()!.skip(Echo, {}));
    // 验证 defaultParams 被 merge 进了渲染的 props
    const el = get()!.currentScreen as React.ReactElement;
    expect(el.type).toBe(Echo);
    expect(el.props).toMatchObject({ value: '' });
  });

  it('未传 defaultParams 时使用注册模板', () => {
    const text = renderAndGetText(GameLevel);
    expect(text).toContain('1'); // GameLevel 模板 { level: 1 }
  });

  it('defaultScreen 未注册时抛错', () => {
    function Unregistered() {
      return React.createElement('div', null, 'x');
    }
    expect(() =>
      render(
        React.createElement(
          ScenarioManagementProvider,
          { defaultScreen: Unregistered as any },
          React.createElement('div', null),
        ),
      ),
    ).toThrow('is not registered');
  });

  it('currentPath 初始为 [defaultScreen]', () => {
    const { get } = renderWithRef(Menu);
    expect(get()!.currentPath).toEqual([Menu]);
  });
});

describe('skip（沿树向下）', () => {
  it('skip 到子节点：路径增加，渲染更新', () => {
    const { get } = renderWithRef(Menu);

    act(() => {
      get()!.skip(GameLevel, { level: 2 });
    });

    const ctx = get()!;
    expect(ctx.currentPath).toEqual([Menu, GameLevel]);
    expect((ctx.currentScreen as React.ReactElement).type).toBe(GameLevel);
    expect((ctx.currentScreen as React.ReactElement).props).toMatchObject({ level: 2 });
  });

  it('skip 到孙子节点：路径继续加深', () => {
    const { get } = renderWithRef(Menu);

    act(() => {
      get()!.skip(GameLevel, { level: 1 });
    });
    act(() => {
      get()!.skip(Combat, { enemy: 'dragon' });
    });

    const ctx = get()!;
    expect(ctx.currentPath).toEqual([Menu, GameLevel, Combat]);
    expect((ctx.currentScreen as React.ReactElement).type).toBe(Combat);
    expect((ctx.currentScreen as React.ReactElement).props).toMatchObject({ enemy: 'dragon' });
  });

  it('skip 到非子节点抛错（严格沿树走）', () => {
    const { get } = renderWithRef(Menu);
    expect(() =>
      act(() => {
        get()!.skip(Combat, { enemy: 'x' });
      }),
    ).toThrow('is not a child of');
  });
});

describe('back（沿树向上）', () => {
  it('从子节点返回父节点', () => {
    const { get } = renderWithRef(Menu);

    act(() => {
      get()!.skip(GameLevel, { level: 1 });
    });
    act(() => {
      get()!.back();
    });

    expect(get()!.currentPath).toEqual([Menu]);
    expect((get()!.currentScreen as React.ReactElement).type).toBe(Menu);
  });

  it('从孙子节点返回父节点', () => {
    const { get } = renderWithRef(Menu);

    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => get()!.skip(Combat, { enemy: 'goblin' }));
    act(() => get()!.back());

    expect(get()!.currentPath).toEqual([Menu, GameLevel]);
    expect((get()!.currentScreen as React.ReactElement).type).toBe(GameLevel);
  });

  it('根节点调用 back 抛错', () => {
    const { get } = renderWithRef(Menu);
    expect(() => act(() => get()!.back())).toThrow('already at the root node');
  });

  it('模块级 back 行为一致', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => back());
    expect(get()!.currentPath).toEqual([Menu]);
  });
});

describe('gotoScreen（跨分支跳转）', () => {
  it('跨分支跳转：从 Combat 到 Settings', () => {
    const { get } = renderWithRef(Menu);

    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => get()!.skip(Combat, { enemy: 'goblin' }));
    act(() => get()!.gotoScreen(Settings, { theme: 'light' }));

    expect(get()!.currentPath).toEqual([Menu, Settings]);
    expect((get()!.currentScreen as React.ReactElement).type).toBe(Settings);
    expect((get()!.currentScreen as React.ReactElement).props).toMatchObject({ theme: 'light' });
  });

  it('gotoScreen 到未注册组件抛错', () => {
    function Ghost() {
      return React.createElement('div', null);
    }
    const { get } = renderWithRef(Menu);
    expect(() =>
      act(() => {
        get()!.gotoScreen(Ghost as any, {});
      }),
    ).toThrow('is not registered');
  });

  it('模块级 gotoScreen 行为一致', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => gotoScreen(Settings, { theme: 'solarized' }));
    expect(get()!.currentPath).toEqual([Menu, Settings]);
  });
});

describe('overlay（浮层）', () => {
  it('打开 overlay 不影响 currentPath', () => {
    const { get } = renderWithRef(Menu);
    const pathBefore = [...get()!.currentPath];

    act(() => get()!.overlay(Notification, { message: 'hello' }));

    const ctx = get()!;
    expect(ctx.currentPath).toEqual(pathBefore);
    expect(ctx.currentOverlay).not.toBeNull();
    expect((ctx.currentOverlay as React.ReactElement).type).toBe(Notification);
    expect((ctx.currentOverlay as React.ReactElement).props).toMatchObject({ message: 'hello' });
  });

  it('closeOverlay 关闭浮层', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.overlay(Notification, { message: 'test' }));
    expect(get()!.currentOverlay).not.toBeNull();

    act(() => get()!.closeOverlay());
    expect(get()!.currentOverlay).toBeNull();
  });

  it('skip 时自动关闭 overlay', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.overlay(Notification, { message: 'x' }));
    expect(get()!.currentOverlay).not.toBeNull();

    act(() => get()!.skip(GameLevel, { level: 1 }));
    expect(get()!.currentOverlay).toBeNull();
  });

  it('back 时自动关闭 overlay', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => get()!.overlay(Notification, { message: 'y' }));
    expect(get()!.currentOverlay).not.toBeNull();

    act(() => get()!.back());
    expect(get()!.currentOverlay).toBeNull();
  });

  it('gotoScreen 时自动关闭 overlay', () => {
    const { get } = renderWithRef(Menu);
    act(() => get()!.skip(GameLevel, { level: 1 }));
    act(() => get()!.overlay(Notification, { message: 'z' }));
    expect(get()!.currentOverlay).not.toBeNull();

    act(() => get()!.gotoScreen(Settings, { theme: 'dark' }));
    expect(get()!.currentOverlay).toBeNull();
  });

  it('模块级 overlay/closeOverlay 行为一致', () => {
    const { get } = renderWithRef(Menu);
    act(() => overlay(Notification, { message: 'mod' }));
    expect(get()!.currentOverlay).not.toBeNull();

    act(() => closeOverlay());
    expect(get()!.currentOverlay).toBeNull();
  });
});

describe('CurrentScreen 组件', () => {
  it('无 overlay 时只渲染栈顶屏幕', () => {
    const text = renderAndGetText(Menu);
    expect(text).toContain('Menu');
  });

  it('有 overlay 时同时渲染两层', () => {
    function TestOverlay() {
      const { overlay: ov } = useScreenSystem();
      useEffect(() => {
        ov(Notification, { message: 'popup!' });
      }, []);
      return React.createElement(CurrentScreen);
    }

    const { container } = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: Menu },
        React.createElement(TestOverlay),
      ),
    );
    expect(container.textContent).toContain('Menu');
    expect(container.textContent).toContain('popup!');
  });
});

describe('模块级函数错误处理', () => {
  it('Provider 未挂载时 skip 抛错', () => {
    expect(() => skip(Menu, {})).toThrow(/called before Provider is mounted/);
  });
  it('Provider 未挂载时 back 抛错', () => {
    expect(() => back()).toThrow(/called before Provider is mounted/);
  });
  it('Provider 未挂载时 gotoScreen 抛错', () => {
    expect(() => gotoScreen(Menu, {})).toThrow(/called before Provider is mounted/);
  });
  it('Provider 未挂载时 overlay 抛错', () => {
    expect(() => overlay(Notification, { message: '' })).toThrow(/called before Provider is mounted/);
  });
  it('Provider 未挂载时 closeOverlay 抛错', () => {
    expect(() => closeOverlay()).toThrow(/called before Provider is mounted/);
  });
});
