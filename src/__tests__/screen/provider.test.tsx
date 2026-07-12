import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { registerComponent } from '../../screen/registry';
import { ScenarioManagementProvider, skip } from '../../screen/provider';
import { useScreenSystem } from '../../screen/hook';

function GameMenu({ text }: { text: string }) {
  return React.createElement('div', null, text);
}
GameMenu.displayName = 'GameMenu';

function GameLevel({ level }: { level: number }) {
  return React.createElement('div', null, String(level));
}
GameLevel.displayName = 'GameLevel';

interface CapturedValue {
  currentScreen: ReactNode;
  skip: (component: any, params: any, options?: any) => void;
}

function CaptureConsumer({ onCapture }: { onCapture: (v: CapturedValue) => void }) {
  const { currentScreen, skip: skipFromHook } = useScreenSystem();
  onCapture({ currentScreen, skip: skipFromHook });
  return React.createElement('div', null);
}

beforeEach(() => {
  registerComponent(GameMenu, { text: '' });
  registerComponent(GameLevel, { level: 1 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScenarioManagementProvider', () => {
  it('使用 defaultScreen 渲染初始屏幕', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu, defaultParams: { text: 'Hello' } },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    expect(captured).toBeDefined();
    const screen = captured!.currentScreen as React.ReactElement;
    expect(screen.type).toBe(GameMenu);
    expect(screen.props).toMatchObject({ text: 'Hello' });
  });

  it('未传 defaultParams 时使用注册模板作为兜底', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    const screen = captured!.currentScreen as React.ReactElement;
    expect(screen.props).toMatchObject({ text: '' });
  });

  it('defaultScreen 未注册时抛错', () => {
    function Unregistered() {
      return React.createElement('div', null, 'x');
    }

    expect(() => {
      render(
        React.createElement(
          ScenarioManagementProvider,
          { defaultScreen: Unregistered },
          React.createElement('div', null, 'child'),
        ),
      );
    }).toThrow('[Ink-Component] defaultScreen');
  });

  it('skip 调用后切换到新屏幕', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    act(() => {
      captured!.skip(GameLevel, { level: 5 });
    });

    const screen = captured!.currentScreen as React.ReactElement;
    expect(screen.type).toBe(GameLevel);
    expect(screen.props).toMatchObject({ level: 5 });
  });

  it('模块级 skip 与 hook skip 行为一致', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    act(() => {
      skip(GameLevel, { level: 99 });
    });

    const screen = captured!.currentScreen as React.ReactElement;
    expect(screen.type).toBe(GameLevel);
    expect(screen.props).toMatchObject({ level: 99 });
  });

  it('skip 到未注册组件抛错', () => {
    function Unregistered() {
      return React.createElement('div', null, 'x');
    }

    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    expect(() => {
      act(() => {
        captured!.skip(Unregistered, {});
      });
    }).toThrow('未注册');
  });

  it('Provider 未挂载时调用模块级 skip 抛错', () => {
    expect(() => {
      skip(GameMenu, { text: '' });
    }).toThrow('Provider 尚未挂载');
  });

  it('onlyAttribute: true 时保留 key（不 remount）', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    act(() => {
      captured!.skip(GameLevel, { level: 1 });
    });

    act(() => {
      captured!.skip(GameLevel, { level: 2 }, { onlyAttribute: true });
    });

    const screen = captured!.currentScreen as React.ReactElement;
    expect(screen.type).toBe(GameLevel);
    expect(screen.props).toMatchObject({ level: 2 });
  });

  it('默认行为（不带 onlyAttribute）强制 remount（key 递增）', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    act(() => {
      captured!.skip(GameLevel, { level: 1 });
    });

    const firstKey = (captured!.currentScreen as React.ReactElement).key;  

    act(() => {
      captured!.skip(GameLevel, { level: 2 });
    });

    const secondKey = (captured!.currentScreen as React.ReactElement).key; 

    expect(firstKey).not.toBe(secondKey);
  });

  it('同一组件 onlyAttribute 时 key 不变', () => {
    let captured: CapturedValue | undefined;

    render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement(CaptureConsumer, {
          onCapture: (v) => {
            captured = v;
          },
        }),
      ),
    );

    act(() => {
      captured!.skip(GameLevel, { level: 1 });
    });

    const firstKey = (captured!.currentScreen as React.ReactElement).key;  

    act(() => {
      captured!.skip(GameLevel, { level: 2 }, { onlyAttribute: true });
    });

    const secondKey = (captured!.currentScreen as React.ReactElement).key; 

    expect(firstKey).toBe(secondKey);
    expect((captured!.currentScreen as React.ReactElement).props).toMatchObject({ level: 2 });
  });

  it('children 正常渲染在 Provider 内部', () => {
    const { container } = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: GameMenu },
        React.createElement('div', null, 'child content'),
      ),
    );

    expect(container.textContent).toContain('child content');
  });
});