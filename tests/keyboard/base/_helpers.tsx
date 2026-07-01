import { render } from 'ink-testing-library';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';
import { useScreenSystem } from '../../../src/screen/hook.js';

/**
 * Wait for asynchronous effects (useEffect, state updates) to flush.
 *
 * ink-testing-library's render is synchronous but React effects
 * are not. A short setTimeout lets the microtask queue drain so
 * that boundKeyboard / blockedKey / etc. registrations inside
 * useEffect are in place before key presses are simulated.
 */
export async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
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
