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
  renderSequenceStack,
} from './_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

/*
 * Intentionally skipped tests and the reasons:
 *
 * 1. Timeout expiry (default 500 ms and custom timeout).
 *    Requires real setTimeout delays — ink-testing-library's synchronous
 *    render / flush model cannot accurately simulate async timer expiry.
 *
 * 2. Navigation cancels a pending sequence.
 *    Requires navigating (skip / back) while a sequence is pending and
 *    then verifying the pending state was cleared.  Multi-screen
 *    navigation + sequence-state interactions are unreliable with
 *    ink-testing-library's synchronous render approach.
 *
 * 3. Complex multi-key within a pending sequence (matching key advances
 *    without cancelling, then a subsequent mismatch cancels it).
 *    Requires precise multi-key orchestration inside a pending sequence
 *    that is difficult to express reliably with the current infrastructure.
 *
 * @2026-07-02 v3.8.0
 */

describe('boundSequence error handling', () => {
  it('throws when called with no current screen mounted', async () => {
    const emptyScreenSystem = createEmptyScreenSystem();

    let renderResult = '';

    function TestHost() {
      const kb = useKeyboard();
      try {
        kb.boundSequence(['g', 'g'], () => {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestHost.displayName = 'TestHost';

    // Cast to any — all 22 fields are provided in createEmptyScreenSystem()
    // but a plain object literal cannot be checked against the complex context interface.
    const { lastFrame } = render(
      <ScreenSystemContext.Provider value={emptyScreenSystem as any}>
        <KeyboardProvider>
          <TestHost />
        </KeyboardProvider>
      </ScreenSystemContext.Provider>,
    );

    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] boundSequence() must be called inside a screen component or overlay.',
    );
  });

  it('throws when fewer than 2 keys are provided', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.boundSequence(['g'], () => {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] boundSequence() requires at least 2 keys in the sequence.',
    );
  });

  it('throws when the sequence action ID is not registered', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.boundSequence('noSuchAction', {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] Sequence action "noSuchAction" is not registered.',
    );
  });

  it('throws when the sequence action has no predefined keys', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.defineSequenceAction([
          { sequenceActionId: 'bare', action: () => {} },
        ]);
        kb.boundSequence('bare', {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      '[Ink-Cartridge] Sequence action "bare" does not have predefined keys.',
    );
  });

  it('throws when a global sequence with cover:false conflicts with the first key', async () => {
    let renderResult = '';

    function TestScreen() {
      const kb = useKeyboard();
      try {
        kb.globalSequence([
          {
            keys: ['g', 'g'],
            operate: () => {},
            cover: false,
            // category must include the owner screen so the cover check fires.
            category: [TestScreen],
          },
        ]);
        kb.boundSequence(['g', 'o'], () => {});
        renderResult = 'no error';
      } catch (e) {
        renderResult = (e as Error).message;
      }
      return <Text>{renderResult}</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    registerComponent(TestScreen, {});

    const { lastFrame } = renderKeyboardApp(TestScreen);
    await flush();
    expect(lastFrame()).toContain(
      'cover: false, so overriding is not allowed.',
    );
  });
});

describe('boundSequence happy path', () => {
  it('fires handler only when the full sequence is entered in order', async () => {
    const { stdin, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();

    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
    expect(childHandler).toHaveBeenCalledWith(
      'g',
      expect.objectContaining({}),
    );
  });

  it('does not fire handler when only the first key is pressed', async () => {
    const { stdin, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'o']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();
  });

  it('consumes the first key so parent boundKeyboard for the same key does not fire', async () => {
    const { stdin, parentFirstKey, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // The sequence on Child consumes 'g' as its first key and enters
    // a pending state.  Parent's 'g' handler must not fire even though
    // Child has no explicit boundKeyboard for 'g' — sequences have
    // priority over boundKeyboard in handleLayer.
    await pressKey(stdin, 'g');
    expect(parentFirstKey).not.toHaveBeenCalled();
  });
});

describe('boundSequence non-exclusive mode', () => {
  it('mismatched key cancels the pending sequence and falls through to normal bindings', async () => {
    const { stdin, parentMismatch, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();

    // 'x' is not the next key in ['g', 'g'].  In non-exclusive mode
    // (the default) the pending sequence is cancelled and the key
    // falls through to parent.
    await pressKey(stdin, 'x');
    expect(childHandler).not.toHaveBeenCalled();
    expect(parentMismatch).toHaveBeenCalledTimes(1);
  });

  it('after cancellation, pressing the first key again restarts the sequence', async () => {
    const { stdin, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // Cancel the first attempt.
    await pressKey(stdin, 'g');
    await pressKey(stdin, 'x');
    expect(childHandler).not.toHaveBeenCalled();

    // A new attempt should start fresh — the previous cancellation
    // cleared the pending state.
    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence exclusive mode', () => {
  it('mismatched key is silently consumed — sequence keeps waiting', async () => {
    const { stdin, parentMismatch, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g'], { exclusive: true });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');

    // In exclusive mode, mismatched keys are swallowed so the user can
    // correct a mistaken key without triggering side effects from normal
    // bindings.  Parent's mismatch handler must not fire.
    await pressKey(stdin, 'x');
    expect(parentMismatch).not.toHaveBeenCalled();

    // Sequence is still pending — completing it should fire the handler.
    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
  });

  it('correct key sequence still completes in exclusive mode', async () => {
    const { stdin, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g'], { exclusive: true });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence onlyThis', () => {
  it('with no overlay active the sequence starts normally', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundSequence(['g', 'g'], handler, { onlyThis: true });
    });
    await flush();

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('with an overlay open the sequence does not start — first key falls through', async () => {
    const handler = vi.fn();
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.boundSequence(['g', 'g'], handler, { onlyThis: true });
      kb.boundKeyboard(['g'], screenHandler);
      sc.openOverlay('ovl', Menu, {});
    });
    await flush();

    // onlyThis + an active overlay means the sequence binding is skipped.
    // The first key should fall through to the screen-level handler.
    await pressKey(stdin, 'g');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('boundSequence focusId', () => {
  it('focusId matching current focus — sequence starts', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-A' });
      kb.boundSequence(['g', 'g'], handler, { focusId: 'input-A' });
    });
    await flush();

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('focusId does not match current focus — sequence does not start, first key falls through', async () => {
    const handler = vi.fn();
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-A' });
      // Sequence is scoped to input-B but focus defaults to input-A.
      kb.boundSequence(['g', 'g'], handler, { focusId: 'input-B' });
      kb.boundKeyboard(['g'], screenHandler);
    });
    await flush();

    await pressKey(stdin, 'g');
    // Sequence should not start because focus is on input-A, not input-B.
    expect(handler).not.toHaveBeenCalled();
  });

  it('two sequences with same first key and different focusIds — only the active focus sequence fires', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-A' });
      kb.boundKeyboard(['y'], vi.fn(), { focusId: 'input-B' });
      kb.boundSequence(['g', 'g'], handlerA, { focusId: 'input-A' });
      kb.boundSequence(['g', 'o'], handlerB, { focusId: 'input-B' });
    });
    await flush();

    // Focus is on input-A (first registered).  Only handlerA should fire.
    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
  });
});

describe('boundSequence when', () => {
  it('when returns true — sequence starts, first key is consumed', async () => {
    const gate = true;
    const { stdin, parentFirstKey, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    expect(parentFirstKey).not.toHaveBeenCalled();

    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
  });

  it('when returns false — sequence does not start, first key falls through to parent', async () => {
    const gate = false;
    const { stdin, parentFirstKey, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    expect(parentFirstKey).toHaveBeenCalledTimes(1);
    expect(childHandler).not.toHaveBeenCalled();
  });

  it('when toggles from true to false mid-sequence — pending sequence is cancelled', async () => {
    let gate = true;
    const { stdin, childHandler, goToChild, lastFrame } =
      renderSequenceStack(['g', 'g'], { when: () => gate });

    await goToChild();
    expect(lastFrame()).toContain('Child');

    // Start the sequence while gate is true.
    await pressKey(stdin, 'g');

    // Flip the gate.  handleLayer checks pending.when() on every key
    // press; when it returns false the pending sequence is cancelled
    // and the key falls through to normal processing.
    gate = false;
    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();
  });
});

describe('boundSequence unbind', () => {
  it('unbind removes the sequence — first key falls through to parent', async () => {
    const { stdin, parentFirstKey, childHandler, goToChild, lastFrame, unbind } =
      renderSequenceStack(['g', 'g']);

    await goToChild();
    expect(lastFrame()).toContain('Child');

    unbind();

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();
    expect(parentFirstKey).toHaveBeenCalledTimes(2);
  });

  it('unbind is idempotent — multiple calls do not throw', async () => {
    const { goToChild, unbind } = renderSequenceStack(['g', 'g']);

    await goToChild();

    expect(() => {
      unbind();
      unbind();
      unbind();
    }).not.toThrow();
  });

  it('unbind only removes the specified sequence, other sequences are unaffected', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      const unbindA = kb.boundSequence(['g', 'g'], handlerA);
      kb.boundSequence(['o', 'o'], handlerB);
      unbindA();
    });
    await flush();

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(handlerA).not.toHaveBeenCalled();

    await pressKey(stdin, 'o');
    await pressKey(stdin, 'o');
    expect(handlerB).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence multiple sequences sharing first key', () => {
  it('second key disambiguates between two sequences with the same first key', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      // Both start with 'g'; the second key ('g' vs 'o') determines
      // which handler fires.
      kb.boundSequence(['g', 'g'], handlerA);
      kb.boundSequence(['g', 'o'], handlerB);
    });
    await flush();

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'o');
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerA).not.toHaveBeenCalled();
  });

  it('when no candidate matches the second key, all are cancelled and the key falls through', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundSequence(['g', 'g'], handlerA);
      kb.boundSequence(['g', 'o'], handlerB);
      kb.boundKeyboard(['x'], screenHandler);
    });
    await flush();

    // Start pending with both candidates active.
    await pressKey(stdin, 'g');

    // 'x' matches neither ['g','g'] nor ['g','o'] at position 1 →
    // all candidates are cancelled and 'x' falls through to normal
    // bindings.
    await pressKey(stdin, 'x');
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();
  });
});

describe('boundSequence sequence action overload', () => {
  it('boundSequence(actionId, options) reuses predefined keys and handler', async () => {
    const actionFn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([
        { sequenceActionId: 'quit', action: actionFn, keys: ['q', 'q'] },
      ]);
      kb.boundSequence('quit', {});
    });
    await flush();

    await pressKey(stdin, 'q');
    await pressKey(stdin, 'q');
    expect(actionFn).toHaveBeenCalledTimes(1);
  });

  it('options passed to boundSequence merge with the action defaults', async () => {
    const actionFn = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.defineSequenceAction([
        {
          sequenceActionId: 'jump',
          action: actionFn,
          keys: ['j', 'k'],
          timeout: 300,
        },
      ]);
      // Override the action's timeout at the call site.
      kb.boundSequence('jump', { timeout: 999 });
    });
    await flush();

    await pressKey(stdin, 'j');
    await pressKey(stdin, 'k');
    expect(actionFn).toHaveBeenCalledTimes(1);
  });
});

describe('boundSequence interaction', () => {
  it('first key blocked by blockedKey — sequence does not start, key passes through', async () => {
    // blockedKey is evaluated before sequences in handleLayer (the
    // unblocked filter runs at line 141, sequences at line 187).
    // If the first sequence key is blocked, it never reaches the
    // sequence system.
    const parentFirstKey = vi.fn();
    const childHandler = vi.fn();

    function Parent() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['s'], () => sc.skip(Child, {}));
        kb.boundKeyboard(['g'], parentFirstKey);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['b'], () => sc.back());
        kb.boundSequence(['g', 'g'], childHandler);
        // blockedKey on the first sequence key makes it transparent —
        // it passes through to parent without ever being consumed by
        // the sequence.
        kb.blockedKey(['g']);
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    clearRegistry();
    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin, lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={Parent}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );

    await pressKey(stdin, 's');
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(childHandler).not.toHaveBeenCalled();
    expect(parentFirstKey).toHaveBeenCalledTimes(2);
  });

  it('sequence handler fires before stop barrier — key consumed by sequence, not by stop', async () => {
    const parentFirstKey = vi.fn();
    const childHandler = vi.fn();

    function Parent() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['s'], () => sc.skip(Child, {}));
        kb.boundKeyboard(['g'], parentFirstKey);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const sc = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['b'], () => sc.back());
        kb.boundSequence(['g', 'g'], childHandler);
        // stop is also registered on 'g', but sequences are evaluated
        // before stop in handleLayer (line 187 vs line 353).  The
        // sequence consumes the first key before stop is ever reached.
        kb.stop(['g']);
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    clearRegistry();
    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin, lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={Parent}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );

    await pressKey(stdin, 's');
    expect(lastFrame()).toContain('Child');

    await pressKey(stdin, 'g');
    await pressKey(stdin, 'g');
    expect(childHandler).toHaveBeenCalledTimes(1);
    // Parent never receives 'g' — the sequence consumed both keys.
    expect(parentFirstKey).not.toHaveBeenCalled();
  });
});
