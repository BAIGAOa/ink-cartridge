import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';

function HostScreen() {
  return <Text>Host</Text>;
}
HostScreen.displayName = 'Host';

function renderIsolatedProvider() {
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function Spy() {
    const kb = useKeyboard();
    useEffect(() => {
      kbRef.current = kb;
    }, [kb]);
    return <Text />;
  }

  clearRegistry();
  registerComponent(HostScreen, {});

  const { unmount } = render(
    <ScenarioManagementProvider  defaultScreen={HostScreen}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return { kb: () => kbRef.current!, unmount };
}

beforeEach(() => {
  clearRegistry();
  registerComponent(HostScreen, {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('two KeyboardProvider instances are fully isolated', () => {
  it('shortcuts registered in instance A are unavailable in instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    a.kb().defineShortcutAction([{ actionId: 'a-only', action: vi.fn() }]);

    expect(() => {
      b.kb().boundKeyboard(['x'], 'a-only');
    }).toThrow(/a-only/);

    a.unmount();
    b.unmount();
  });

  it('two instances can each register same-named shortcut without conflict', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    const spyA = vi.fn();
    const spyB = vi.fn();

    expect(() => a.kb().defineShortcutAction([{ actionId: 'shared', action: spyA }])).not.toThrow();
    expect(() => b.kb().defineShortcutAction([{ actionId: 'shared', action: spyB }])).not.toThrow();

    expect(() => a.kb().boundKeyboard(['a'], 'shared')).not.toThrow();
    expect(() => b.kb().boundKeyboard(['b'], 'shared')).not.toThrow();

    a.unmount();
    b.unmount();
  });

  it('globalKeys of instance A do not affect instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    const spyA = vi.fn();
    a.kb().defineShortcutAction([{ actionId: 'quit-a', action: spyA }]);
    a.kb().globalKeys([{ key: 'q', operate: 'quit-a' }]);

    expect(() => {
      b.kb().globalKeys([{ key: 'z', operate: 'quit-a' } as any]);
    }).toThrow(/quit-a/);

    a.unmount();
    b.unmount();
  });

  it('focus target registered in instance A does not exist in instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    a.kb().boundKeyboard(['return'], () => {}, { focusId: 'btn-a' });

    expect(b.kb().focusCurrent()).toBeNull();
    expect(() => b.kb().focusSet('btn-a'))
      .toThrow(/focus target not found.*btn-a|no keyboard layer found/);
    expect(b.kb().focusCurrent()).toBeNull();

    a.unmount();
    b.unmount();
  });

  it('focusNext in instance A does not affect focus state in instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    a.kb().boundKeyboard(['a'], () => {}, { focusId: 'a1' });
    a.kb().boundKeyboard(['b'], () => {}, { focusId: 'a2' });
    a.kb().boundKeyboard(['c'], () => {}, { focusId: 'a3' });

    b.kb().boundKeyboard(['x'], () => {}, { focusId: 'b1' });
    b.kb().boundKeyboard(['y'], () => {}, { focusId: 'b2' });

    expect(a.kb().focusCurrent()).toBe('a1');
    a.kb().focusNext();
    expect(a.kb().focusCurrent()).toBe('a2');
    a.kb().focusNext();
    expect(a.kb().focusCurrent()).toBe('a3');

    expect(b.kb().focusCurrent()).toBe('b1');

    a.unmount();
    b.unmount();
  });

  it('boundKeyboard bindings in instance A do not leak to instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    a.kb().boundKeyboard(['enter'], vi.fn());

    expect(() => b.kb().stop(['enter'])).not.toThrow();

    a.unmount();
    b.unmount();
  });

  it('blockedKey in instance A does not affect instance B', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    a.kb().blockedKey(['escape']);

    const spyB = vi.fn();
    expect(() => b.kb().boundKeyboard(['escape'], spyB)).not.toThrow();

    a.unmount();
    b.unmount();
  });

  it('two instances alive simultaneously, each operates independently', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    const spyA = vi.fn();
    a.kb().defineShortcutAction([{ actionId: 'go', action: spyA }]);
    a.kb().boundKeyboard(['g'], 'go');
    a.kb().boundKeyboard(['a'], () => {}, { focusId: 'fa1' });
    a.kb().boundKeyboard(['b'], () => {}, { focusId: 'fa2' });
    a.kb().blockedKey(['x']);

    const spyB = vi.fn();
    b.kb().defineShortcutAction([{ actionId: 'run', action: spyB }]);
    b.kb().boundKeyboard(['r'], 'run');
    b.kb().boundKeyboard(['c'], () => {}, { focusId: 'fb1' });
    b.kb().boundKeyboard(['d'], () => {}, { focusId: 'fb2' });
    b.kb().blockedKey(['y']);

    expect(() => a.kb().boundKeyboard(['g2'], 'go')).not.toThrow();
    expect(a.kb().focusCurrent()).toBe('fa1');
    a.kb().focusNext();
    expect(a.kb().focusCurrent()).toBe('fa2');

    expect(() => b.kb().boundKeyboard(['z'], 'go')).toThrow(/go/);
    expect(b.kb().focusCurrent()).toBe('fb1');
    expect(() => b.kb().boundKeyboard(['r2'], 'run')).not.toThrow();

    a.unmount();
    b.unmount();
  });

  it('after unmounting instance A, instance B still works', () => {
    const a = renderIsolatedProvider();
    const b = renderIsolatedProvider();

    const spyB = vi.fn();
    b.kb().defineShortcutAction([{ actionId: 'stay', action: spyB }]);
    b.kb().boundKeyboard(['s'], 'stay');
    b.kb().boundKeyboard(['t'], () => {}, { focusId: 'fb' });

    a.unmount();

    expect(b.kb().focusCurrent()).toBe('fb');
    expect(() => b.kb().boundKeyboard(['s2'], 'stay')).not.toThrow();
    expect(() => b.kb().boundKeyboard(['x'], 'a-only-ghost')).toThrow();

    b.unmount();
  });
});
