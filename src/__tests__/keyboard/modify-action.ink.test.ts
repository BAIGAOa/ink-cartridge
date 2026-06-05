import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { KeyboardProvider, clearShortcutOperations } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';

async function flush() {
  await new Promise((r) => setTimeout(r, 10));
}

async function press(stdin: { write: (data: string) => void }, key: string) {
  stdin.write(key);
  await new Promise((r) => setTimeout(r, 10));
}

function createTestScreen(
  setup: (kb: ReturnType<typeof useKeyboard>) => () => void,
) {
  let cleanupFn: (() => void) | undefined;

  function TestScreen() {
    const kb = useKeyboard();
    useEffect(() => {
      cleanupFn = setup(kb);
      return cleanupFn;
    }, []);
    return React.createElement(Text, null, 'TestScreen');
  }
  TestScreen.displayName = 'TestScreen';

  clearRegistry();
  registerComponent(TestScreen, {});

  const { lastFrame, stdin, unmount } = render(
    React.createElement(
      ScenarioManagementProvider,
      { defaultScreen: TestScreen },
      React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
    ),
  );

  return { lastFrame, stdin, unmount };
}

beforeEach(() => {
  clearRegistry();
  clearShortcutOperations();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('boundKeyboard(actionId, options) — 使用预设 keys', () => {
  it('定义 shortcut 时带 keys，可直接通过 actionId 绑定，按键触发', async () => {
    const actionSpy = vi.fn();

    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'submit', action: actionSpy, keys: ['return'] },
      ]);
      const unbind = kb.boundKeyboard('submit', { focusId: 'btn' });
      return () => {
        unbind();
      };
    });

    await flush();
    await press(stdin, '\r');
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('定义 shortcut 时带 keys，绑定后可解绑', async () => {
    const actionSpy = vi.fn();

    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'del', action: actionSpy, keys: ['delete'] },
      ]);
      const unbind = kb.boundKeyboard('del', { focusId: 'btn' });
      unbind();
      return () => {};
    });

    await flush();
    await press(stdin, '\x1b[3~');
    expect(actionSpy).not.toHaveBeenCalled();
  });

  it('定义 shortcut 时未提供 keys，调用 boundKeyboard(actionId) 报错', async () => {
    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'noKeys', action: vi.fn() },
      ]);
      expect(() => {
        kb.boundKeyboard('noKeys', { focusId: 'btn' });
      }).toThrow(/does not have predefined keys/);
      return () => {};
    });

    await flush();
  });
});

describe('modifyAction — 修改预设 keys', () => {
  it('修改 keys 后，新绑定的 boundKeyboard 使用新键', async () => {
    const actionSpy = vi.fn();

    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'toggle', action: actionSpy, keys: ['a'] },
      ]);
      kb.modifyAction('toggle', ['b']);
      const unbind = kb.boundKeyboard('toggle', { focusId: 'btn' });
      return () => {
        unbind();
      };
    });

    await flush();

    await press(stdin, 'a');
    expect(actionSpy).not.toHaveBeenCalled();

    await press(stdin, 'b');
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('修改 keys 不影响已存在的绑定（已绑定仍使用旧 keys）', async () => {
    const actionSpy = vi.fn();

    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'cmd', action: actionSpy, keys: ['x'] },
      ]);
      
      const unbind1 = kb.boundKeyboard('cmd', { focusId: 'same' });
     
      kb.modifyAction('cmd', ['y']);
      
      const unbind2 = kb.boundKeyboard('cmd', { focusId: 'same' });
      return () => {
        unbind1();
        unbind2();
      };
    });

    await flush();

    // 按 'x' 应该触发第一次绑定的回调
    await press(stdin, 'x');
    expect(actionSpy).toHaveBeenCalledTimes(1);

    actionSpy.mockClear();
    
    await press(stdin, 'y');
    expect(actionSpy).toHaveBeenCalledTimes(1);

    actionSpy.mockClear();
    
    await press(stdin, 'x');
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('modifyAction 对未注册的 actionId 报错', async () => {
    const { stdin } = createTestScreen((kb) => {
      expect(() => {
        kb.modifyAction('ghost', ['z']);
      }).toThrow(/action not registered/);
      return () => {};
    });
    await flush();
  });

  it('modifyAction 对未带 keys 字段的 action 报错', async () => {
    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'noKeys', action: vi.fn() },
      ]);
      expect(() => {
        kb.modifyAction('noKeys', ['new']);
      }).toThrow(/was not registered with a 'keys' field/);
      return () => {};
    });
    await flush();
  });
});

describe('焦点系统与 actionId 绑定', () => {
  it('actionId 绑定可配合 focusId，只有获得焦点的组件收到事件', async () => {
    const actionA = vi.fn();
    const actionB = vi.fn();

    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'actA', action: actionA, keys: ['a'] },
        { actionId: 'actB', action: actionB, keys: ['a'] },
      ]);
      const unbindA = kb.boundKeyboard('actA', { focusId: 'inputA' });
      const unbindB = kb.boundKeyboard('actB', { focusId: 'inputB' });
      return () => {
        unbindA();
        unbindB();
      };
    });

    await flush();

    await press(stdin, 'a');
    expect(actionA).toHaveBeenCalledTimes(1);
    expect(actionB).not.toHaveBeenCalled();
  });
});

describe('boundKeyboard(actionId) 参数校验', () => {
  it('调用 boundKeyboard(actionId) 不提供 options 时自动绑定到屏幕级', async () => {
    const actionSpy = vi.fn();
    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'test', action: actionSpy, keys: ['t'] },
      ]);
      // boundKeyboard(actionId) without options: binds at screen level with predefined keys
      expect(() => kb.boundKeyboard('test')).not.toThrow();
      return () => {};
    });
    await flush();
    await press(stdin, 't');
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('调用 boundKeyboard(actionId) 不带 options 时 action 无 keys 则抛错', async () => {
    const { stdin } = createTestScreen((kb) => {
      kb.defineShortcutAction([
        { actionId: 'noKeys', action: vi.fn() },
      ]);
      expect(() => kb.boundKeyboard('noKeys')).toThrow(/does not have predefined keys/);
      return () => {};
    });
    await flush();
  });
});