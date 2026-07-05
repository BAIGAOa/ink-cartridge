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
import GlobalSequenceDisplayBox from '../../src/dev/globalSeq-display.js';
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
    <ScenarioManagementProvider  defaultScreen={defaultScreen}>
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
  registerComponent(GlobalSequenceDisplayBox, { top: 0, left: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GlobalSequenceDisplayBox — Ctrl+S opens the inspector', () => {
  it('opens GlobalSequence inspector modal via Ctrl+S', async () => {
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

    // Press Ctrl+S to open global sequences inspector
    stdin.write('\x13'); // Ctrl+S
    await flush();

    expect(scRef.current!.modalQueue.length).toBeGreaterThanOrEqual(2);
    const modalIds = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(modalIds).toContain('__globalSeq-display__');
  });

  it('displays empty state when no global sequences registered', async () => {
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

    // Opening Ctrl+S should not throw even with zero sequences
    stdin.write('\x13');
    await flush();

    expect(scRef.current!.modalQueue.map((m: any) => m.id)).toContain('__globalSeq-display__');
  });
});

describe('GlobalSequenceDisplayBox — Escape closes the inspector', () => {
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
    stdin.write('\x13'); // Ctrl+S
    await flush();

    expect(scRef.current!.modalQueue.map((m: any) => m.id)).toContain('__globalSeq-display__');

    // Inspector's escape binding registers in useEffect after mount
    await flush();
    await flush();
    await press(stdin, '\x1b');
    await flush();

    // Escape should close the inspector
    const ids = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(ids).not.toContain('__globalSeq-display__');
    expect(ids).toContain('_Dev-Tool_');
  });
});

describe('GlobalSequenceDisplayBox — arrow movement', () => {
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
    stdin.write('\x13'); // Ctrl+S
    await flush();

    expect(() => { stdin.write('\x1b[A'); }).not.toThrow();
    expect(() => { stdin.write('\x1b[B'); }).not.toThrow();
  });
});
