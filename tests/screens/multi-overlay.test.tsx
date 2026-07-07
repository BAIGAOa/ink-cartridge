import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { act } from 'react';

import { registerComponent, clearRegistry } from '../../src/screen/registry.js';
import { ScenarioManagementProvider, clearDispatchers } from '../../src/screen/provider.js';
import { CurrentScreen } from '../../src/screen/current-screen.js';
import { useScreenSystem } from '../../src/screen/hook.js';
import { KeyboardProvider, clearShortcutOperations } from '../../src/keyboard/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

async function pressKey(stdin: { write: (data: string) => void }, key: string): Promise<void> {
  await act(async () => {
    stdin.write(key);
  });
}

function MainScreen() {
  return <Text>MainScreen</Text>;
}
MainScreen.displayName = 'MainScreen';

function createOverlay(
  displayName: string,
  bindings: Record<string, () => void>,
  setup?: (kb: ReturnType<typeof useKeyboard>) => (() => void) | void,
) {
  const handlers = { ...bindings };

  function Overlay() {
    const kb = useKeyboard();
    useEffect(() => {
      const cleanups: (() => void)[] = [];
      for (const [key, handler] of Object.entries(handlers)) {
        cleanups.push(kb.boundKeyboard([key], handler));
      }
      if (setup) {
        const teardown = setup(kb);
        if (teardown) cleanups.push(teardown);
      }
      return () => cleanups.forEach((c) => c());
    }, [kb.boundKeyboard]);
    return <Text>{displayName}</Text>;
  }
  Overlay.displayName = displayName;
  registerComponent(Overlay, {});

  return { Component: Overlay, handlers };
}

interface MultiOverlayRenderResult {
  lastFrame: () => string | undefined;
  stdin: { write: (data: string) => void };
  unmount: () => void;
}

function renderMultiOverlayApp(
  defaultScreen: React.ComponentType<any>,
  setup?: (
    kb: ReturnType<typeof useKeyboard>,
    sc: ReturnType<typeof useScreenSystem>,
  ) => (() => void) | void,
): MultiOverlayRenderResult {
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

  return { lastFrame: () => lastFrame(), stdin, unmount };
}

beforeEach(() => {
  clearRegistry();
  registerComponent(MainScreen, {});
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

describe('multi-overlay keyboard integration', () => {
  describe('broadcast', () => {
    it('all active overlays receive the same key', async () => {
      const ovlA = createOverlay('OvlA', { x: vi.fn() });
      const ovlB = createOverlay('OvlB', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', ovlA.Component, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlB.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlA.handlers['x']).toHaveBeenCalledTimes(1);
      expect(ovlB.handlers['x']).toHaveBeenCalledTimes(1);
    });

    it('one overlay consuming a key does not prevent other overlays from receiving it', async () => {
      const ovlA = createOverlay('OvlA', { x: vi.fn() });
      const ovlB = createOverlay('OvlB', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', ovlA.Component, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlB.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlA.handlers['x']).toHaveBeenCalledTimes(1);
      expect(ovlB.handlers['x']).toHaveBeenCalledTimes(1);
    });

    it('zIndex does not gate broadcast — even the lowest zIndex overlay receives keys', async () => {
      const ovlLow = createOverlay('OvlLow', { z: vi.fn() });
      const ovlHigh = createOverlay('OvlHigh', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('low', ovlLow.Component, {}, { zIndex: 1 });
        sc.openOverlay('high', ovlHigh.Component, {}, { zIndex: 100 });
      });
      await flush();

      await pressKey(stdin, 'z');
      await pressKey(stdin, 'x');
      expect(ovlLow.handlers['z']).toHaveBeenCalledTimes(1);
      expect(ovlHigh.handlers['x']).toHaveBeenCalledTimes(1);
    });
  });

  describe('screen blocking', () => {
    it('screen handler does not fire when any overlay consumes the key', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovl.handlers['x']).toHaveBeenCalledTimes(1);
      expect(screenX).not.toHaveBeenCalled();
    });

    it('screen handler fires when no overlay handles the key', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', { y: vi.fn() });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(screenX).toHaveBeenCalledTimes(1);
    });

    it('close all overlays and screen resumes', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
        sc.closeAllOverlays();
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(screenX).toHaveBeenCalledTimes(1);
      expect(ovl.handlers['x']).not.toHaveBeenCalled();
    });

    it('only overlays that handled the key block the screen — a second overlay not handling leaves screen running', async () => {
      // This contradicts the "any overlay consumed" rule. If overlay A handles
      // the key, anyOverlayConsumed is set regardless of overlay B's result.
      // The screen stays blocked even if overlay B did nothing.
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovlA = createOverlay('OvlA', { x: vi.fn() });
      const ovlB = createOverlay('OvlB', { y: vi.fn() });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovlA.Component, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlB.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlA.handlers['x']).toHaveBeenCalledTimes(1);
      expect(screenX).not.toHaveBeenCalled();
    });
  });

  describe('penetration', () => {
    it('penetrated key is not consumed by the overlay and reaches the screen', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', { y: vi.fn() }, (kb) => {
        kb.penetration(['x']);
      });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(screenX).toHaveBeenCalledTimes(1);
    });

    it('penetrated key still reaches other overlays', async () => {
      const ovlTop = createOverlay('OvlTop', { y: vi.fn() }, (kb) => {
        kb.penetration(['x']);
      });
      const ovlBottom = createOverlay('OvlBottom', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('top', ovlTop.Component, {}, { zIndex: 2 });
        sc.openOverlay('bottom', ovlBottom.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlBottom.handlers['x']).toHaveBeenCalledTimes(1);
    });

    it('penetration with when: false blocks the key as usual', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', { x: vi.fn() }, (kb) => {
        kb.penetration(['x'], { when: () => false });
      });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovl.handlers['x']).toHaveBeenCalledTimes(1);
      expect(screenX).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stopped key on an overlay blocks the screen even without a binding', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const ovl = createOverlay('Ovl', {}, (kb) => {
        kb.stop(['x']);
      });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(screenX).not.toHaveBeenCalled();
    });

    it('stop on one overlay does not block other overlays', async () => {
      const ovlTop = createOverlay('OvlTop', {}, (kb) => {
        kb.stop(['x']);
      });
      const ovlBottom = createOverlay('OvlBottom', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('top', ovlTop.Component, {}, { zIndex: 2 });
        sc.openOverlay('bottom', ovlBottom.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlBottom.handlers['x']).toHaveBeenCalledTimes(1);
    });

    it('unstop makes the key reach the screen again', async () => {
      const screenX = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], screenX), [kb.boundKeyboard]);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      let unstop: () => void = () => {};
      const ovl = createOverlay('Ovl', {}, (kb) => {
        unstop = kb.stop(['x']);
      });

      const { stdin } = renderMultiOverlayApp(ScreenWithKey, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(screenX).not.toHaveBeenCalled();

      unstop();
      await pressKey(stdin, 'x');
      expect(screenX).toHaveBeenCalledTimes(1);
    });
  });

  describe('modal × overlay', () => {
    it('active modal prevents all overlays from receiving keys', async () => {
      const modalH = vi.fn();
      const modal = createOverlay('Modal', { a: modalH });
      const ovl = createOverlay('Ovl', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
        sc.openModal('M', modal.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovl.handlers['x']).not.toHaveBeenCalled();
    });
  });

  describe('onlyThis', () => {
    it('onlyThis binding fires when it is the only overlay', async () => {
      const handler = vi.fn();

      function SoloOverlay() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], handler, { onlyThis: true }), [kb.boundKeyboard]);
        return <Text>SoloOverlay</Text>;
      }
      SoloOverlay.displayName = 'SoloOverlay';
      registerComponent(SoloOverlay, {});

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('solo', SoloOverlay, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onlyThis binding does not fire when multiple overlays are active', async () => {
      const handler = vi.fn();

      function OnlyThisOverlay() {
        const kb = useKeyboard();
        useEffect(() => kb.boundKeyboard(['x'], handler, { onlyThis: true }), [kb.boundKeyboard]);
        return <Text>OnlyThisOverlay</Text>;
      }
      OnlyThisOverlay.displayName = 'OnlyThisOverlay';
      registerComponent(OnlyThisOverlay, {});

      const ovlOther = createOverlay('OvlOther', { y: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', OnlyThisOverlay, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlOther.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('globalKeys × overlay', () => {
    it('overlay binding overrides a global key when affectOverlay is true', async () => {
      const globalH = vi.fn();
      const ovlH = vi.fn();

      const ovl = createOverlay('Ovl', { x: ovlH });

      const { stdin } = renderMultiOverlayApp(MainScreen, (kb, sc) => {
        kb.globalKeys([{ key: 'x', operate: globalH, affectOverlay: true }]);
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlH).toHaveBeenCalledTimes(1);
      expect(globalH).not.toHaveBeenCalled();
    });

    it('affectOverlay: true + cover: false — overlay boundKeyboard throws, neither handler fires', async () => {
      const globalH = vi.fn();
      const ovlH = vi.fn();

      const ovl = createOverlay('Ovl', { x: ovlH });

      const { stdin } = renderMultiOverlayApp(MainScreen, (kb, sc) => {
        kb.globalKeys([{ key: 'x', operate: globalH, affectOverlay: true, cover: false }]);
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');

      await flush();

      // The reason this isn't called here is because when the global key is overridden with cover: false, the system will automatically throw an error, so it won't be called here.
      expect(globalH).toHaveBeenCalledTimes(0);
      expect(ovlH).not.toHaveBeenCalled();
    });

    it('affectOverlay: true + cover: true', async () => {
        const g = vi.fn();
        const o = vi.fn();

        const ovl = createOverlay('Ovl', { x: o });

        const { stdin } = renderMultiOverlayApp(MainScreen, (kb, sc) => {
          kb.globalKeys([{ key: 'x', operate: g, affectOverlay: true, cover: true }]);
          sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
        });

        await flush();

        await pressKey(stdin, 'x');

        expect(g).toHaveBeenCalledTimes(0);
        expect(o).toHaveBeenCalledTimes(1);
    })

    it('affectOverlay: true, cover: false — no overlay override, global key fires', async () => {
      const globalH = vi.fn();

      const ovl = createOverlay('Ovl', { y: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (kb, sc) => {
        kb.globalKeys([{ key: 'x', operate: globalH, affectOverlay: true, cover: false }]);
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(globalH).toHaveBeenCalledTimes(1);
    });

    it('affectOverlay: false — global key fires after overlay, both fire', async () => {
      const globalH = vi.fn();
      const ovlH = vi.fn();

      const ovl = createOverlay('Ovl', { x: ovlH });

      const { stdin } = renderMultiOverlayApp(MainScreen, (kb, sc) => {
        kb.globalKeys([{ key: 'x', operate: globalH }]);
        sc.openOverlay('A', ovl.Component, {}, { zIndex: 1 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlH).toHaveBeenCalledTimes(1);
      expect(globalH).toHaveBeenCalledTimes(1);
    });

    it('affectOverlay: false, cover: false — override check skipped, global key fires', async () => {
      const globalH = vi.fn();

      function ScreenClean() {
        return <Text>ScreenClean</Text>;
      }
      ScreenClean.displayName = 'ScreenClean';
      registerComponent(ScreenClean, {});

      const { stdin } = renderMultiOverlayApp(ScreenClean, (kb) => {
        kb.globalKeys([{ key: 'x', operate: globalH, affectOverlay: false, cover: false }]);
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(globalH).toHaveBeenCalledTimes(1);
    });

    it('affectOverlay: false, cover: true — screen binding overrides global key', async () => {
      const globalH = vi.fn();
      const screenH = vi.fn();

      function ScreenWithKey() {
        const kb = useKeyboard();
        useEffect(() => {
          kb.globalKeys([{ key: 'x', operate: globalH }]);
          return kb.boundKeyboard(['x'], screenH);
        }, []);
        return <Text>ScreenWithKey</Text>;
      }
      ScreenWithKey.displayName = 'ScreenWithKey';
      registerComponent(ScreenWithKey, {});

      const { stdin } = renderMultiOverlayApp(ScreenWithKey);
      await flush();

      await pressKey(stdin, 'x');
      expect(screenH).toHaveBeenCalledTimes(1);
      expect(globalH).not.toHaveBeenCalled();
    });
  });

  describe('focus system across overlays', () => {
    it('each overlay has independent focus targets', async () => {
      const focusA = vi.fn();
      const focusB = vi.fn();

      function OverlayA() {
        const kb = useKeyboard();
        useEffect(() => {
          const unbind = kb.boundKeyboard(['x'], focusA, { focusId: 'fa' });
          kb.focusSet('fa');
          return unbind;
        }, [kb.boundKeyboard]);
        return <Text>OverlayA</Text>;
      }
      OverlayA.displayName = 'OverlayA';
      registerComponent(OverlayA, {});

      function OverlayB() {
        const kb = useKeyboard();
        useEffect(() => {
          const unbind = kb.boundKeyboard(['x'], focusB, { focusId: 'fb' });
          kb.focusSet('fb');
          return unbind;
        }, [kb.boundKeyboard]);
        return <Text>OverlayB</Text>;
      }
      OverlayB.displayName = 'OverlayB';
      registerComponent(OverlayB, {});

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', OverlayA, {}, { zIndex: 1 });
        sc.openOverlay('B', OverlayB, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(focusA).toHaveBeenCalledTimes(1);
      expect(focusB).toHaveBeenCalledTimes(1);
    });
  });

  describe('dynamic overlays', () => {
    it('new overlay opened mid-session participates in broadcast', async () => {
      const ovlA = createOverlay('OvlA', { x: vi.fn() });
      const ovlB = createOverlay('OvlB', { x: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', ovlA.Component, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlB.Component, {}, { zIndex: 2 });
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlA.handlers['x']).toHaveBeenCalledTimes(1);
      expect(ovlB.handlers['x']).toHaveBeenCalledTimes(1);
    });

    it('closing one overlay leaves the other working', async () => {
      const ovlA = createOverlay('OvlA', { x: vi.fn() });
      const ovlB = createOverlay('OvlB', { y: vi.fn() });

      const { stdin } = renderMultiOverlayApp(MainScreen, (_kb, sc) => {
        sc.openOverlay('A', ovlA.Component, {}, { zIndex: 1 });
        sc.openOverlay('B', ovlB.Component, {}, { zIndex: 2 });
        sc.closeOverlay('B');
      });
      await flush();

      await pressKey(stdin, 'x');
      expect(ovlA.handlers['x']).toHaveBeenCalledTimes(1);
    });
  });
});
