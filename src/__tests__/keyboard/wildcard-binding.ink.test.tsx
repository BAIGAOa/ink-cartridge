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

async function press(
  stdin: { write: (data: string) => void },
  key: string,
) {
  stdin.write(key);
  await new Promise((r) => setTimeout(r, 10));
}

function renderWildcardScreen(
  setup: (kb: ReturnType<typeof useKeyboard>) => (() => void) | void,
) {
  function Host() {
    const kb = useKeyboard();
    useEffect(() => {
      const cleanup = setup(kb);
      return cleanup ?? undefined;
    }, []);
    return <Text>WildcardHost</Text>;
  }
  Host.displayName = 'WildcardHost';

  clearRegistry();
  registerComponent(Host, {});

  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={Host}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
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

describe('通配符 * 绑定', () => {
  it('普通字符触发通配符回调', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('a', expect.objectContaining({}));

    await press(stdin, 'b');
    expect(handler).toHaveBeenCalledTimes(2);

    await press(stdin, '1');
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('特殊键 return 不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, '\r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('特殊键 escape 不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, '\x1b');
    expect(handler).not.toHaveBeenCalled();
  });

  it('方向键不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, '\x1b[A'); // up
    await press(stdin, '\x1b[B'); // down
    await press(stdin, '\x1b[C'); // right
    await press(stdin, '\x1b[D'); // left
    expect(handler).not.toHaveBeenCalled();
  });

  it('tab 键不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, '\t');
    expect(handler).not.toHaveBeenCalled();
  });

  it('backspace 不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    await press(stdin, '\x7f');
    expect(handler).not.toHaveBeenCalled();
  });

  it('ctrl+字符组合不触发通配符（应走具体键名匹配）', async () => {
    const wildcardHandler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], wildcardHandler);
    });
    await flush();

    // ctrl+s emits 's' with ctrl modifier — should NOT match wildcard
    await press(stdin, '\x13'); // ctrl+s via ASCII
    // Ink may not emit input for ctrl+s, but the wildcard path checks isNormalCharacter
    // which rejects keys with ctrl modifier
    expect(wildcardHandler).not.toHaveBeenCalled();
  });

  it('通配符可与其他具体键并存，各自独立触发', async () => {
    const wildcardHandler = vi.fn();
    const enterHandler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], wildcardHandler);
      kb.boundKeyboard(['return'], enterHandler);
    });
    await flush();

    await press(stdin, 'x');
    expect(wildcardHandler).toHaveBeenCalledTimes(1);
    expect(enterHandler).not.toHaveBeenCalled();

    await press(stdin, '\r');
    expect(wildcardHandler).toHaveBeenCalledTimes(1);
    expect(enterHandler).toHaveBeenCalledTimes(1);
  });

  it('通配符绑定可以解绑', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      const unbind = kb.boundKeyboard(['*'], handler);
      unbind();
    });
    await flush();

    await press(stdin, 'z');
    expect(handler).not.toHaveBeenCalled();
  });

  it('通配符在 focus 级绑定时仅当前焦点收到事件', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler1, { focusId: 'input1' });
      kb.boundKeyboard(['*'], handler2, { focusId: 'input2' });
    });
    await flush();

    // Only the first focus target is active
    await press(stdin, 'a');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('通配符受 blockedKey 影响可穿透（blockedKey 阻止具体键命中，通配符仍匹配）', async () => {
    const screenHandler = vi.fn();
    const focusHandler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      // focus-level binds both 'x' and '*'; blockedKey('x') blocks the specific 'x' binding
      // but the wildcard '*' still fires at focus level
      kb.boundKeyboard(['x'], focusHandler, { focusId: 'inp' });
      kb.boundKeyboard(['*'], screenHandler);
      kb.blockedKey(['x'], { focusId: 'inp' });
    });
    await flush();

    // blockedKey('x') blocks the specific 'x' binding at focus level,
    // so 'x' hits the screen-level wildcard '*'
    await press(stdin, 'x');
    expect(focusHandler).not.toHaveBeenCalled();
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });
});

describe('isNormalCharacter 边界条件', () => {
  it('空 input 不触发通配符', async () => {
    const handler = vi.fn();
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], handler);
    });
    await flush();

    // Press return, which sends empty input with return:true
    await press(stdin, '\r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('仅定义通配符绑定的屏幕中，特殊键无匹配时正常丢弃', async () => {
    const { stdin } = renderWildcardScreen((kb) => {
      kb.boundKeyboard(['*'], vi.fn());
    });
    await flush();

    // Tab should be silently dropped since no focus targets and no tab binding
    await expect(press(stdin, '\t')).resolves.not.toThrow();
  });
});
