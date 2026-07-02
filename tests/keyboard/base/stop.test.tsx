import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import {
  clearDispatchers,
  ScenarioManagementProvider,
} from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { ScreenSystemContext } from '../../../src/screen/context.js';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { useScreenSystem } from '../../../src/screen/hook.js';
import {
  KeyboardProvider,
  clearShortcutOperations,
} from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';
import {
  Menu,
  setupKeyboardTests,
  flush,
  pressKey,
  renderKeyboardApp,
  createEmptyScreenSystem,
  renderStopStack,
} from './_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});



describe('stop error handling', () => {
  it('throws when called with no current screen mounted', async () => {
    const emptyScreenSystem = createEmptyScreenSystem();

    let renderResult = '';

    function TestHost() {
      const kb = useKeyboard();
      try {
        // Called during render so the synchronous throw from
        // getCurrentOwner() returning null is caught before React's
        // error boundary swallows it.
        kb.stop(['x']);
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestHost.displayName = 'TestHost';

    // Cast to any — all fields are provided but a plain object literal
    // cannot be type-checked against the complex context interface.
    const { lastFrame } = render(
      <ScreenSystemContext.Provider value={emptyScreenSystem as any}>
        <KeyboardProvider>
          <TestHost />
        </KeyboardProvider>
      </ScreenSystemContext.Provider>,
    );

    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] stop() must be called inside a screen component or overlay.',
    );
  });
});



describe('stop propagation barrier', () => {
  it('consumes the key even when no handler matches — parent never receives it', async () => {
    const { stdin, parentX, childX, goToChild, lastFrame } =
      renderStopStack(['x']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // Child has no handler for 'x' and stop consumed the key, so
    // it never reaches the parent.
    expect(parentX).not.toHaveBeenCalled();
    expect(childX).not.toHaveBeenCalled();
  });

  it('binding fires before the stop barrier — child handler executes, parent does not', async () => {
    const { stdin, parentX, childX, goToChild, lastFrame } =
      renderStopStack(['x'], undefined, true);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // Child has a handler for 'x' which fires before stop is evaluated;
    // key is consumed by the binding so parent never sees it.
    expect(childX).toHaveBeenCalledTimes(1);
    expect(parentX).not.toHaveBeenCalled();
  });
});



describe('stop when', () => {
  it('when returns true: stop barrier applies, parent does not fire', async () => {
    const gate = true;
    const { stdin, parentX, goToChild, lastFrame } =
      renderStopStack(['x'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // Stop rule is active because when() returns true.
    expect(parentX).not.toHaveBeenCalled();
  });

  it('when returns false: stop is ignored, key propagates to parent', async () => {
    const gate = false;
    const { stdin, parentX, goToChild, lastFrame } =
      renderStopStack(['x'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // Stop rule is ignored because when() returns false; child has
    // no handler for 'x', so the key propagates to parent.
    expect(parentX).toHaveBeenCalledTimes(1);
  });

  it('when toggles dynamically — stop tracks the live gate value', async () => {
    let gate = true;
    const { stdin, parentX, goToChild, lastFrame } =
      renderStopStack(['x'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // Round 1: gate is true → stop active, parent does not fire.
    await pressKey(stdin, 'x');
    expect(parentX).not.toHaveBeenCalled();

    // Round 2: gate becomes false → stop disabled, key propagates.
    gate = false;
    await pressKey(stdin, 'x');
    expect(parentX).toHaveBeenCalledTimes(1);

    // Round 3: gate back to true → stop active again.
    gate = true;
    parentX.mockClear();
    await pressKey(stdin, 'x');
    expect(parentX).not.toHaveBeenCalled();
  });
});



describe('stop key isolation', () => {
  it('only stops the specified keys — other keys are unaffected', async () => {
    const { stdin, parentY, childY, goToChild, lastFrame } =
      renderStopStack(['x']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // 'y' was not added to stop, so the child handler fires normally.
    await pressKey(stdin, 'y');
    expect(childY).toHaveBeenCalledTimes(1);
    // Parent should not receive 'y' — child consumed it via its handler.
    expect(parentY).not.toHaveBeenCalled();
  });
});


describe('stop focusId scope', () => {
  it('stop with focusId on an inactive target does not affect the active one', async () => {
    const screenHandler = vi.fn();
    const handlerA = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      // Screen-level fallback.
      kb.boundKeyboard(['x'], screenHandler);
      // input-A: first registered → active by default.
      kb.boundKeyboard(['x'], handlerA, { focusId: 'input-A' });
      // input-B: stop 'x' scoped to this target.  Bind 'y' so the
      // focus target is registered.
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-B' });
      kb.stop(['x'], { focusId: 'input-B' });
    });
    await flush();

    // Focus is on input-A (first registered). stop on input-B should
    // not affect this key press — input-A's handler fires.
    await pressKey(stdin, 'x');
    expect(handlerA).toHaveBeenCalledTimes(1);
    // Screen-level handler should not fire — input-A consumed the key.
    expect(screenHandler).not.toHaveBeenCalled();
  });

  it('stop with focusId on the active target consumes the key', async () => {
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['x'], screenHandler);
      // input-A: register with 'y' handler so it can hold focus.
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-A' });
      // input-B: stop 'x' on this target, register with 'y' handler.
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-B' });
      kb.stop(['x'], { focusId: 'input-B' });
      // Activate input-B so its stop takes effect.
      kb.focusSet('input-B');
    });
    await flush();

    // Focus is on input-B. Stop on input-B consumes 'x' at the focus
    // level — the key never reaches the screen-level handler.
    await pressKey(stdin, 'x');
    expect(screenHandler).not.toHaveBeenCalled();
  });
});


describe('stop stopAction', () => {
  it('resolves action IDs to key names without throwing', async () => {
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineShortcutAction([
        { actionId: 'submit', action: () => {}, keys: ['x'] },
      ]);
      // Bind the action so its keys are registered in actionKeysMap.
      kb.boundKeyboard('submit', {});
      // Stop by action ID — should resolve 'submit' → 'x' without throwing.
      kb.stop(['submit'], { stopAction: true });
    });
    await flush();

    // Press 'x' — the action binding fires first (boundKeyboard('submit')
    // created a binding for 'x'), so the key is consumed by the handler
    // before the stop barrier is reached.  The success of this test is
    // measured by the absence of a throw from stop().
    await pressKey(stdin, 'x');
  });

  it('throws when the action ID is not registered', async () => {
    let caughtMessage = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.stop(['noSuchAction'], { stopAction: true });
      } catch (e) {
        caughtMessage = (e as Error).message;
      }
      return <Text>{caughtMessage || 'no error'}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    // Must be registered before use as defaultScreen.
    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();

    expect(lastFrame()).toContain(
      '[Ink-Cartridge] stop(["noSuchAction"], { stopAction: true })',
    );
  });
});



describe('stop unstop', () => {
  it('unstop removes the barrier so the key propagates to parent', async () => {
    const { stdin, parentX, goToChild, lastFrame, unstop } =
      renderStopStack(['x']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // Before unstop: key is consumed by stop.
    await pressKey(stdin, 'x');
    expect(parentX).not.toHaveBeenCalled();

    // Remove the stop barrier.
    unstop();

    // After unstop: key propagates to parent.
    await pressKey(stdin, 'x');
    expect(parentX).toHaveBeenCalledTimes(1);
  });

  it('unstop is idempotent — multiple calls do not throw', async () => {
    const { goToChild, unstop } = renderStopStack(['x']);

    await goToChild();

    // The unstop function should be safe to call any number of times.
    expect(() => {
      unstop();
      unstop();
      unstop();
    }).not.toThrow();
  });

  it('unstop only removes the keys it added — other stopped keys remain', async () => {
    // Two independent stop calls so that unstopping one leaves the
    // other intact.  Written inline because renderStopStack wraps
    // all keys in a single stop() call.
    const parentX = vi.fn();
    const parentY = vi.fn();

    let unstopX!: () => void;

    function Parent() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['s'], () => sc.skip(Child, {}));
        kb.boundKeyboard(['x'], parentX);
        kb.boundKeyboard(['y'], parentY);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['b'], () => sc.back());
        unstopX = kb.stop(['x']);
        // Stop 'y' independently — we never unstop it, so 'y' should
        // remain blocked after unstopX() is called.
        kb.stop(['y']);
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    clearRegistry();
    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { lastFrame, stdin } = render(
      <ScenarioManagementProvider defaultScreen={Parent}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );

    await pressKey(stdin, 's');
    expect(lastFrame()).toContain('Child');

    // Both keys are stopped — neither reaches parent.
    await pressKey(stdin, 'x');
    await pressKey(stdin, 'y');
    expect(parentX).not.toHaveBeenCalled();
    expect(parentY).not.toHaveBeenCalled();

    // Unstop only 'x'.
    unstopX();

    // 'x' now propagates, 'y' is still stopped.
    await pressKey(stdin, 'x');
    expect(parentX).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'y');
    expect(parentY).not.toHaveBeenCalled();
  });
});
