import { render } from 'ink-testing-library';
import React, { useRef, useEffect } from 'react';
import { Text } from 'ink';
import {
  registerComponent,
  clearRegistry,
} from '../../../src/screen/registry.js';
import {
  ScenarioManagementProvider,
  clearDispatchers,
} from '../../../src/screen/provider.js';
import { useScreenSystem } from '../../../src/screen/hook.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import type { ScreenSystemContextValue } from '../../../src/screen/context.js';

export function Menu() {
  return <Text>Menu</Text>;
}

export function GameLevel({ level }: { level: number }) {
  return <Text>Level {level}</Text>;
}

export function Combat({ enemy }: { enemy: string }) {
  return <Text>Combat: {enemy}</Text>;
}

export function Settings({ theme }: { theme: string }) {
  return <Text>Settings: {theme}</Text>;
}

export function Notification({ message }: { message: string }) {
  return <Text>{message}</Text>;
}

export function renderWithCapture(defaultScreen: React.ComponentType<any>) {
  const captureRef: { current: ScreenSystemContextValue | null } = {
    current: null,
  };

  function Capture() {
    const ctx = useScreenSystem();
    const ref = useRef(captureRef);
    // Update synchronously during render so callers can read the latest
    // context immediately after a navigation action without flushing effects.
    ref.current.current = ctx;
    useEffect(() => {
      ref.current.current = ctx;
    }, [ctx]);
    return <CurrentScreen />;
  }

  const { lastFrame, unmount } = render(
    <ScenarioManagementProvider defaultScreen={defaultScreen}>
      <Capture />
    </ScenarioManagementProvider>,
  );

  return {
    getCapture: () => captureRef.current,
    lastFrame: () => lastFrame(),
    unmount,
  };
}

export function setupBaseScreenTests() {
  clearRegistry();
  registerComponent(Menu, {});
  registerComponent(Settings, { theme: 'dark' }, { parent: Menu });
  registerComponent(GameLevel, { level: 1 }, { parent: Menu });
  registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });
  registerComponent(Notification, { message: '' });
}

export function teardownBaseScreenTests() {
  clearDispatchers();
}
