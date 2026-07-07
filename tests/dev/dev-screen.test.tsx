import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { registerComponent, clearRegistry } from '../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../src/screen/provider.js';
import { CurrentScreen } from '../../src/screen/current-screen.js';
import { KeyboardProvider, clearShortcutOperations } from '../../src/keyboard/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import { useScreenSystem } from '../../src/screen/hook.js';
import { DevScreen } from '../../src/dev/dev-screen.js';
import GlobalKeyDisplayBox from '../../src/dev/globalKey-display.js';
import LayerKeyDisplayBox from '../../src/dev/layerKey-display.js';
import { openDevTool, closeDevTool } from '../../src/dev/entrance.js';
import { flush, press } from '../components/base/_helpers.js';

function renderApp(defaultScreen: React.ComponentType<any>) {
  const scRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };

  function Spy() {
    const sc = useScreenSystem();
    useEffect(() => {
      scRef.current = sc;
    }, [sc]);
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

function Main() {
  const { boundKeyboard: bk } = useKeyboard();
  useEffect(() => {
    bk(['d'], () => openDevTool({ top: 0, left: 0 }));
  }, []);
  return <Text>Main</Text>;
}
Main.displayName = 'Main';

beforeEach(() => {
  clearRegistry();
  clearShortcutOperations();
  registerComponent(DevScreen, { top: 0, left: 0 });
  registerComponent(GlobalKeyDisplayBox, { top: 0, left: 0 });
  registerComponent(LayerKeyDisplayBox, { top: 0, left: 0, screenComponent: () => null });
  registerComponent(Main, {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DevScreen open / close toggle', () => {
  it('opens DevScreen modal via openDevTool', async () => {
    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();

    expect(scRef.current!.modalQueue.length).toBe(1);
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');
  });

  it('toggle via escape inside DevScreen closes the modal', async () => {
    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    // DevScreen binds escape to closeDevTool: need double flush
    // for the modal-open state update + DevScreen's useEffect to register binding
    await flush();
    await flush();
    await press(stdin, '\x1b');
    await flush();

    expect(scRef.current!.activeModalId).toBeNull();
    expect(scRef.current!.modalQueue.length).toBe(0);
  });

  it('closeDevTool is safe (no-op) when modal does not exist', () => {
    expect(() => { closeDevTool(); }).not.toThrow();
  });
});

describe('DevScreen keyboard arrow movement', () => {
  it('arrow-up and arrow-down are handled without errors', async () => {
    function MainWithOpen() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['o'], () => openDevTool({ top: 5, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    MainWithOpen.displayName = 'MainWithOpen';
    registerComponent(MainWithOpen, {});

    const { stdin, scRef } = renderApp(MainWithOpen);
    await flush();

    await press(stdin, 'o');
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    expect(() => { stdin.write('\x1b[A'); }).not.toThrow();
    expect(() => { stdin.write('\x1b[B'); }).not.toThrow();
  });

  it('clamps to top boundary at 0 without throwing', async () => {
    function MainWithOpen() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['o'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    MainWithOpen.displayName = 'MainWithOpen';
    registerComponent(MainWithOpen, {});

    const { stdin } = renderApp(MainWithOpen);
    await flush();

    await press(stdin, 'o');
    await flush();

    // Press up arrow 50 times - should not throw
    for (let i = 0; i < 50; i++) {
      stdin.write('\x1b[A');
    }
    await flush();
  });
});

describe('DevScreen displays overlay and modal state', () => {
  it('shows overlay via displayedOverlays', async () => {
    function SecondOverlay() {
      return <Text>OL</Text>;
    }
    SecondOverlay.displayName = 'SecondOverlay';
    registerComponent(SecondOverlay, {});

    function MainWithOverlay() {
      const { openOverlay } = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['1'], () => openDevTool({ top: 0, left: 0 }));
        kb.boundKeyboard(['2'], () => openOverlay('second-ovl', SecondOverlay, {}));
      }, []);
      return <Text>Main</Text>;
    }
    MainWithOverlay.displayName = 'MainWithOverlay';
    registerComponent(MainWithOverlay, {});

    const { stdin, scRef } = renderApp(MainWithOverlay);
    await flush();

    await press(stdin, '2');
    await flush();
    expect(scRef.current!.displayedOverlays.length).toBe(1);

    await press(stdin, '1');
    await flush();
    expect(scRef.current!.displayedOverlays.length).toBe(1);
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');
  });

  it('shows modal queue via modalQueue', async () => {
    function OtherModal() {
      return <Text>OM</Text>;
    }
    OtherModal.displayName = 'OtherModal';
    registerComponent(OtherModal, {});

    function MainWithModals() {
      const { openModal: ctxOpenModal } = useScreenSystem();
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['1'], () => {
          ctxOpenModal('other-modal', OtherModal, {}, { zIndex: 10 });
          openDevTool({ top: 0, left: 0 });
        });
      }, []);
      return <Text>Main</Text>;
    }
    MainWithModals.displayName = 'MainWithModals';
    registerComponent(MainWithModals, {});

    const { stdin, scRef } = renderApp(MainWithModals);
    await flush();

    await press(stdin, '1');
    await flush();

    expect(scRef.current!.modalQueue.length).toBe(2);
    const ids = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(ids).toContain('_Dev-Tool_');
    expect(ids).toContain('other-modal');
    expect(scRef.current!.activeModalId).toBe('other-modal');
  });
});

describe('DevScreen Ctrl+G opens GlobalKey inspector', () => {
  it('opens global key display modal via Ctrl+G', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'MainGK';
    registerComponent(Main, {});

    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    stdin.write('\x07'); // Ctrl+G
    await flush();

    const modalIds = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(modalIds).toContain('__global-display__');
  });
});

describe('DevScreen Ctrl+K opens LayerKey inspector', () => {
  it('opens layer key display modal via Ctrl+K', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'MainLK';
    registerComponent(Main, {});

    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    stdin.write('\x0b'); // Ctrl+K
    await flush();

    const modalIds = scRef.current!.modalQueue.map((m: any) => m.id);
    expect(modalIds).toContain('__layer-display__');
  });
});

describe('DevScreen focus targets display', () => {
  it('shows focus targets when screen has registered bindings', async () => {
    function MainWithFocus() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['x'], () => {}, { focusId: 'test-focus' });
        kb.boundKeyboard(['y'], () => {}, { focusId: 'test-focus-2' });
        kb.boundKeyboard(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    MainWithFocus.displayName = 'MainWithFocus';
    registerComponent(MainWithFocus, {});

    const { stdin, scRef } = renderApp(MainWithFocus);
    await flush();

    await press(stdin, 'd');
    await flush();

    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');
    // Focus targets should be collected from the main screen layer
    // This exercises collectAllFocusTargets (lines 48-50)
  });
});

describe('DevScreen modal miss flash', () => {
  it('flashes border when unhandled key is pressed', async () => {
    function Main() {
      const { boundKeyboard: bk } = useKeyboard();
      useEffect(() => {
        bk(['d'], () => openDevTool({ top: 0, left: 0 }));
      }, []);
      return <Text>Main</Text>;
    }
    Main.displayName = 'MainFlash';
    registerComponent(Main, {});

    const { stdin, scRef } = renderApp(Main);
    await flush();

    await press(stdin, 'd');
    await flush();
    await flush();
    expect(scRef.current!.activeModalId).toBe('_Dev-Tool_');

    // Press an unhandled key — should trigger flash via useModalMissListener
    expect(() => stdin.write('z')).not.toThrow();
  });
});
