import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { registerComponent, clearRegistry } from '../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../src/screen/provider.js';
import { CurrentScreen } from '../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../src/keyboard/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import { useScreenSystem } from '../../src/screen/hook.js';
import { DevScreen } from '../../src/dev/dev-screen.js';
import LayerKeyDisplayBox from '../../src/dev/layerKey-display.js';
import { openDevTool } from '../../src/dev/entrance.js';
import { flush, press } from '../components/base/_helpers.js';

function renderApp(defaultScreen: React.ComponentType<any>) {
  const scRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };

  function Spy() {
    const sc = useScreenSystem();
    useEffect(() => { scRef.current = sc; }, [sc]);
    return <CurrentScreen />;
  }

  const { stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={defaultScreen}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return { stdin, unmount, scRef };
}

beforeEach(() => {
  clearRegistry();
  registerComponent(DevScreen, { top: 0, left: 0 });
  registerComponent(LayerKeyDisplayBox, { top: 0, left: 0, screenComponent: () => null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LayerKeyDisplayBox — Ctrl+K opens the inspector', () => {
  it('opens LayerKey inspector modal via Ctrl+K', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});

    const { stdin, scRef } = renderApp(Main);
    await flush();

    // Open DevScreen
    await press(stdin, 'd');
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    // Press Ctrl+K to open layer keys inspector
    stdin.write('\x0b'); // Ctrl+K is VT character
    await flush();

    expect(scRef.current!.modalQueue.length).toBeGreaterThanOrEqual(2);
    const modalIds = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(modalIds).toContain('__layer-display__');
  });

  it('closes via Escape and returns to DevScreen', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});

    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    stdin.write('\x0b'); // Ctrl+K
    await flush();

    expect(scRef.current!.modalQueue.map((m: any) => m.id)).toContain('__layer-display__');

    await flush();
    await flush();
    await press(stdin, '\x1b');
    await flush();

    const ids = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(ids).not.toContain('__layer-display__');
    expect(ids).toContain('_Dev-Tool_');
  });

  it('up and down arrows do not throw', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'Main';
    registerComponent(Main, {});

    const { stdin } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    stdin.write('\x0b'); // Ctrl+K
    await flush();

    expect(() => { stdin.write('\x1b[A'); }).not.toThrow();
    expect(() => { stdin.write('\x1b[B'); }).not.toThrow();
  });
});
