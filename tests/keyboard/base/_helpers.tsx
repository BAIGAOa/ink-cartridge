import { render } from 'ink-testing-library';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { vi } from 'vitest';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';
import { useScreenSystem } from '../../../src/screen/hook.js';
import type { BlockedKeyOptions, StopOptions, SequenceOptions } from '../../../src/keyboard/types.js';

/**
 * Wait for asynchronous effects (useEffect, state updates) to flush.
 *
 * ink-testing-library's render is synchronous but React effects
 * are not. A short setTimeout lets the microtask queue drain so
 * that boundKeyboard / blockedKey / etc. registrations inside
 * useEffect are in place before key presses are simulated.
 */
export async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Simulate a key press by writing raw data to stdin.
 *
 * Uses ink-testing-library's `stdin.write()` to feed data into
 * Ink's internal readline-based input parser, which then fires
 * the `useInput` handler inside KeyboardProvider.
 *
 * Always followed by a `flush()` so that the event pipeline
 * (normalizeKeyNames → handleLayer → callbacks) has time to
 * complete before assertions run.
 */
export async function pressKey(
  stdin: { write: (data: string) => void },
  key: string,
): Promise<void> {
  stdin.write(key);
  await flush();
}

export function Menu() {
  return <Text>Menu</Text>;
}
Menu.displayName = 'Menu';

export function GameLevel({ level }: { level: number }) {
  return <Text>Level {level}</Text>;
}
GameLevel.displayName = 'GameLevel';

export function Combat({ enemy }: { enemy: string }) {
  return <Text>Combat: {enemy}</Text>;
}
Combat.displayName = 'Combat';

export function Settings({ theme }: { theme: string }) {
  return <Text>Settings: {theme}</Text>;
}
Settings.displayName = 'Settings';

export function Notification({ message }: { message: string }) {
  return <Text>{message}</Text>;
}
Notification.displayName = 'Notification';

/**
 * Register the standard screen tree used across keyboard tests.
 *
 * Tree:
 *   Menu
 *   ├── GameLevel (parent: Menu)
 *   │   └── Combat (parent: GameLevel)
 *   ├── Settings (parent: Menu)
 *   Notification (root-level, no parent)
 */
export function setupKeyboardTests(): void {
  clearRegistry();
  registerComponent(Menu, {});
  registerComponent(Settings, { theme: 'dark' }, { parent: Menu });
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });
  registerComponent(Notification, { message: '' });
}

/**
 * Render a full keyboard-enabled app for testing.
 *
 * Wraps the component tree in {@link ScenarioManagementProvider}
 * and {@link KeyboardProvider}, then renders {@link CurrentScreen}
 * so that navigation and keyboard layers work together.
 *
 * The `setup` callback runs inside useEffect on the host component,
 * giving it access to both the keyboard API and the screen system.
 * Return a cleanup function from setup to unbind on unmount.
 *
 * @param defaultScreen - The initially-rendered screen component
 *   (must already be registered via setupKeyboardTests or manually).
 * @param setup - Optional callback receiving (kb, sc) for binding
 *   keys and navigating during initial mount.
 */
export function renderKeyboardApp(
  defaultScreen: React.ComponentType<any>,
  setup?: (
    kb: ReturnType<typeof useKeyboard>,
    sc: ReturnType<typeof useScreenSystem>,
  ) => (() => void) | void,
): {
  lastFrame: () => string | undefined;
  stdin: { write: (data: string) => void };
  unmount: () => void;
} {
  function AppHost() {
    const kb = useKeyboard();
    const sc = useScreenSystem();

    useEffect(() => {
      if (setup) {
        const cleanup = setup(kb, sc);
        return cleanup ?? undefined;
      }
      return;
    }, []);

    return <CurrentScreen />;
  }
  AppHost.displayName = 'AppHost';

  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={defaultScreen}>
      <KeyboardProvider>
        <AppHost />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return { lastFrame, stdin, unmount };
}

/**
 * Create a minimal ScreenSystemContext value with an empty
 * screen path (`currentPath: []`).
 *
 * Used when a test needs to simulate the "no screen mounted" state —
 * for example, verifying that `blockedKey` throws when called outside
 * of any screen component.
 *
 * The returned object satisfies all required fields of the context
 * value shape (22 fields). Functions are no-ops; arrays are empty;
 * nullable fields are null.
 */
export function createEmptyScreenSystem(): object {
  const noop = () => {};
  return {
    currentScreen: null,
    currentOverlays: [],
    currentModals: [],
    currentPath: [] as React.ComponentType<any>[],
    skip: noop,
    back: noop,
    gotoScreen: noop,
    openOverlay: noop,
    closeOverlay: noop,
    closeAllOverlays: noop,
    activateOverlay: noop,
    deactivateOverlay: noop,
    activeOverlayIds: [] as string[],
    displayedOverlays: [] as any[],
    displayedModals: [] as any[],
    renderedModalEntries: [] as any[],
    activeModalId: null as string | null,
    activeModal: null as any,
    modalQueue: [] as any[],
    openModal: noop,
    closeModal: noop,
    closeAllModals: noop,
  };
}

/**
 * Result of {@link renderPenetrationStack}.
 */
export interface PenetrationStackResult {
  lastFrame: () => string | undefined;
  stdin: { write: (data: string) => void };
  unmount: () => void;
  /** Handler bound to 'x' on the Parent screen. */
  parentX: ReturnType<typeof vi.fn>;
  /** Handler bound to 'y' on the Parent screen. */
  parentY: ReturnType<typeof vi.fn>;
  /** Handler bound to 'x' on the Child screen. */
  childX: ReturnType<typeof vi.fn>;
  /** Handler bound to 'y' on the Child screen. */
  childY: ReturnType<typeof vi.fn>;
  /** Press 's' to navigate from Parent to Child, then flush. */
  goToChild: () => Promise<void>;
}

/**
 * Render a two-screen stack for testing `blockedKey` penetration.
 *
 * The Parent screen has handlers for `x`, `y`, and `s` (skip to Child).
 * The Child screen has handlers for `x`, `y`, and `b` (back to Parent),
 * and calls `blockedKey` on the configured keys with the given options.
 *
 * Tree:  Parent → Child (child of Parent)
 *
 * @param blockKeys  - Keys to mark as transparent on the Child layer.
 * @param blockOpts  - Optional {@link BlockedKeyOptions} (when, focusId).
 * @2026-07-02 v3.8.0
 */
export function renderPenetrationStack(
  blockKeys: string[],
  blockOpts?: BlockedKeyOptions,
): PenetrationStackResult {
  const parentX = vi.fn();
  const parentY = vi.fn();
  const childX = vi.fn();
  const childY = vi.fn();

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
      kb.boundKeyboard(['x'], childX);
      kb.boundKeyboard(['y'], childY);
      kb.blockedKey(blockKeys, blockOpts);
    }, []);
    return <Text>Child</Text>;
  }
  Child.displayName = 'Child';

  clearRegistry();
  registerComponent(Parent, {});
  registerComponent(Child, {}, { parent: Parent });

  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={Parent}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    lastFrame: () => lastFrame(),
    stdin,
    unmount,
    parentX,
    parentY,
    childX,
    childY,
    goToChild: () => pressKey(stdin, 's'),
  };
}

/**
 * Result of {@link renderStopStack}.
 */
export interface StopStackResult {
  lastFrame: () => string | undefined;
  stdin: { write: (data: string) => void };
  unmount: () => void;
  /** Handler bound to 'x' on the Parent screen. */
  parentX: ReturnType<typeof vi.fn>;
  /** Handler bound to 'y' on the Parent screen. */
  parentY: ReturnType<typeof vi.fn>;
  /** Handler bound to 'x' on the Child screen (only when `childBindsStoppedKeys` is true). */
  childX: ReturnType<typeof vi.fn>;
  /** Handler bound to 'y' on the Child screen. */
  childY: ReturnType<typeof vi.fn>;
  /** Press 's' to navigate from Parent to Child, then flush. */
  goToChild: () => Promise<void>;
  /** Calls the unstop function returned by `stop()`. */
  unstop: () => void;
}

/**
 * Render a two-screen stack for testing `stop` propagation.
 *
 * The Parent screen has handlers for `x`, `y`, and `s` (skip to Child).
 * The Child screen has a handler for `y`, and calls `stop` on the
 * configured keys with the given options.
 *
 * When `childBindsStoppedKeys` is `true`, the Child also binds a
 * handler for each stopped key — this is used to verify that a
 * matching binding fires before the stop barrier is reached.
 *
 * Tree:  Parent → Child (child of Parent)
 *
 * @param stopKeys              - Keys to stop on the Child layer.
 * @param stopOpts              - Optional {@link StopOptions} (when, focusId, stopAction).
 * @param childBindsStoppedKeys - If true, Child binds handlers for stopKeys.
 * @2026-07-02 v3.8.0
 */
export function renderStopStack(
  stopKeys: string[],
  stopOpts?: StopOptions,
  childBindsStoppedKeys: boolean = false,
): StopStackResult {
  const parentX = vi.fn();
  const parentY = vi.fn();
  const childX = vi.fn();
  const childY = vi.fn();

  // Captured so the test can call the unstop function at any time.
  let unstopFn: (() => void) | null = null;

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
      kb.boundKeyboard(['y'], childY);
      if (childBindsStoppedKeys) {
        for (const k of stopKeys) {
          kb.boundKeyboard([k], childX);
        }
      }
      unstopFn = kb.stop(stopKeys, stopOpts);
    }, []);
    return <Text>Child</Text>;
  }
  Child.displayName = 'Child';

  clearRegistry();
  registerComponent(Parent, {});
  registerComponent(Child, {}, { parent: Parent });

  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={Parent}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    lastFrame: () => lastFrame(),
    stdin,
    unmount,
    parentX,
    parentY,
    childX,
    childY,
    goToChild: () => pressKey(stdin, 's'),
    unstop: () => unstopFn?.(),
  };
}

/**
 * Result of {@link renderSequenceStack}.
 */
export interface SequenceStackResult {
  lastFrame: () => string | undefined;
  stdin: { write: (data: string) => void };
  unmount: () => void;
  /** Parent handler bound to the first key of the sequence. */
  parentFirstKey: ReturnType<typeof vi.fn>;
  /** Parent handler bound to a mismatch key ('x') for tracking fall-through. */
  parentMismatch: ReturnType<typeof vi.fn>;
  /** Child sequence handler — fires when the full sequence is matched. */
  childHandler: ReturnType<typeof vi.fn>;
  /** Press 's' to navigate from Parent to Child, then flush. */
  goToChild: () => Promise<void>;
  /** Unbind the sequence binding. */
  unbind: () => void;
}

/**
 * Render a two-screen stack for testing `boundSequence` behavior.
 *
 * The Parent screen binds handlers for the **first key** of the sequence
 * (to verify it is consumed by the sequence system) and for a generic
 * mismatch key `x` (to verify fall-through in non-exclusive mode).
 * The Child screen calls `boundSequence` and binds `b` to go back.
 *
 * Tree:  Parent → Child (child of Parent)
 *
 * @param sequenceKeys - Ordered keys for the sequence (≥ 2).
 * @param opts         - Optional {@link SequenceOptions}.
 * @2026-07-02 v3.8.0
 */
export function renderSequenceStack(
  sequenceKeys: string[],
  opts?: SequenceOptions,
): SequenceStackResult {
  const parentFirstKey = vi.fn();
  const parentMismatch = vi.fn();
  const childHandler = vi.fn();

  let unbindFn: (() => void) | null = null;

  const firstKey = sequenceKeys[0];

  function Parent() {
    const sc = useScreenSystem();
    const kb = useKeyboard();
    useEffect(() => {
      kb.boundKeyboard(['s'], () => sc.skip(Child, {}));
      // Track whether the sequence's first key propagates to parent.
      kb.boundKeyboard([firstKey], parentFirstKey);
      // 'x' is used as the generic mismatch key in tests.
      kb.boundKeyboard(['x'], parentMismatch);
    }, []);
    return <Text>Parent</Text>;
  }
  Parent.displayName = 'Parent';

  function Child() {
    const sc = useScreenSystem();
    const kb = useKeyboard();
    useEffect(() => {
      kb.boundKeyboard(['b'], () => sc.back());
      unbindFn = kb.boundSequence(sequenceKeys, childHandler, opts);
    }, []);
    return <Text>Child</Text>;
  }
  Child.displayName = 'Child';

  clearRegistry();
  registerComponent(Parent, {});
  registerComponent(Child, {}, { parent: Parent });

  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={Parent}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    lastFrame: () => lastFrame(),
    stdin,
    unmount,
    parentFirstKey,
    parentMismatch,
    childHandler,
    goToChild: () => pressKey(stdin, 's'),
    unbind: () => unbindFn?.(),
  };
}
