import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { clearDispatchers } from '../../../src/screen/provider.js';
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
  renderPenetrationStack,
} from './_helpers.js';
// ScreenSystemContext is needed only for the error-handling test where
// we provide a mock context value with an empty screen path.
import { ScreenSystemContext } from '../../../src/screen/context.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

describe('penetration error handling', () => {
  it('throws when called with no current screen mounted', async () => {
    // Provide a screen-system context with an empty path so that
    // getCurrentOwner() inside penetration returns null, triggering
    // the "must be called inside a screen component or overlay" error.
    const emptyScreenSystem = createEmptyScreenSystem();

    // Call penetration synchronously during render so we can catch the
    // error before React's error boundary swallows it. In the empty-path
    // scenario getCurrentOwner() returns null, which triggers the guard.
    let renderResult = '';

    function TestHost() {
      const kb = useKeyboard();
      try {
        // Calling penetration during render is intentional here â€?
        // it lets us catch the synchronous throw from getCurrentOwner()
        // returning null when the screen path is empty.
        kb.penetration(['x']);
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestHost.displayName = 'TestHost';

    // Cast to any â€?all 22 fields from ScreenSystemContextValue are
    // provided in createEmptyScreenSystem() but a plain object literal
    // cannot be checked against a complex React context interface.
    const { lastFrame } = render(
      <ScreenSystemContext.Provider value={emptyScreenSystem as any}>
        <KeyboardProvider>
          <TestHost />
        </KeyboardProvider>
      </ScreenSystemContext.Provider>,
    );

    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] penetration() must be called inside a screen component or overlay.',
    );
  });
});

describe('penetration penetration', () => {
  it('makes the specified key transparent â€?parent handler fires, child handler is skipped', async () => {
    const { stdin, parentX, childX, goToChild, lastFrame } =
      renderPenetrationStack(['x']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // Child marked 'x' as transparent via penetration, so the key
    // passes through to the Parent layer.
    expect(parentX).toHaveBeenCalledTimes(1);
    expect(childX).not.toHaveBeenCalled();
  });

  it('when condition returns true: key is transparent, same as unconditional penetration', async () => {
    const gate = true;
    const { stdin, parentX, childX, goToChild, lastFrame } =
      renderPenetrationStack(['x'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // when() returns true â†?penetration rule applies, key passes through.
    expect(parentX).toHaveBeenCalledTimes(1);
    expect(childX).not.toHaveBeenCalled();
  });

  it('when condition returns false: key is NOT transparent, child handler fires', async () => {
    const gate = false;
    const { stdin, parentX, childX, goToChild, lastFrame } =
      renderPenetrationStack(['x'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'x');
    // when() returns false â†?penetration rule is ignored, child consumes
    // the key and parent never sees it.
    expect(childX).toHaveBeenCalledTimes(1);
    expect(parentX).not.toHaveBeenCalled();
  });

  it('only affects the specified keys â€?other keys fire child handler normally', async () => {
    const { stdin, parentY, childY, goToChild, lastFrame } =
      renderPenetrationStack(['x']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // 'y' was NOT added to penetration, so the child handler fires.
    await pressKey(stdin, 'y');
    expect(childY).toHaveBeenCalledTimes(1);
    // Parent should NOT receive 'y' â€?child consumed it.
    expect(parentY).not.toHaveBeenCalled();
  });
});

describe('penetration focusId scope', () => {
  it('penetration restricted to one focus target does not affect another active target', async () => {
    const screenHandler = vi.fn();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      // Screen-level fallback â€?fires only if the key is not consumed
      // by any focus-level binding or blocked.
      kb.boundKeyboard(['x'], screenHandler);
      // input-A: first registered â†?active by default.
      kb.boundKeyboard(['x'], handlerA, { focusId: 'input-A' });
      // input-B: penetration scoped to this target, with its own handler.
      kb.penetration(['x'], { focusId: 'input-B' });
      kb.boundKeyboard(['x'], handlerB, { focusId: 'input-B' });
    });
    await flush();

    // Focus is on input-A (first registered). penetration only applies
    // to input-B, so input-A's handler fires normally.
    await pressKey(stdin, 'x');
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
    // Screen-level handler should not fire â€?the key was consumed by
    // the active focus target (input-A).
    expect(screenHandler).not.toHaveBeenCalled();
  });
});
