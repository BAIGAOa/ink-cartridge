import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import React, { act, useContext, useEffect } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import {
  registerComponent,
  clearRegistry,
} from '../../src/screen/registry.js';
import {
  clearDispatchers,
  ScenarioManagementProvider,
  back as moduleBack,
  gotoScreen as moduleGotoScreen,
  skip as moduleSkip,
} from '../../src/screen/provider.js';
import { CurrentScreen } from '../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../src/keyboard/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import { useScreenSystem } from '../../src/screen/hook.js';
import { LayerElementContext } from '../../src/screen/LayerElementContext.js';
import { ModalLayerElementContext } from '../../src/screen/ModalLayerElementContext.js';

const handlers = {
  layerZ: vi.fn(),
  modalZ: vi.fn(),
  pageZMain: vi.fn(),
  pageZGame: vi.fn(),
  pageZCombat: vi.fn(),
  pageTGame: vi.fn(),
};

let currentUnmount: (() => void) | null = null;

function LayerEl() {
  const ctx = useContext(LayerElementContext);
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    if (!ctx) return;
    const unbind = boundKeyboard(
      ['z'],
      () => handlers.layerZ(),
      { elementId: ctx.id },
    );
    return unbind;
  }, [boundKeyboard, ctx]);

  return <Text>LayerEl</Text>;
}

function ModalEl() {
  const ctx = useContext(ModalLayerElementContext);
  const { boundKeyboard, allowModal } = useKeyboard();

  useEffect(() => {
    if (!ctx) return;
    const unbind = boundKeyboard(
      ['z'],
      () => handlers.modalZ(),
      { elementId: ctx.id },
    );
    const unallow = allowModal(['t'], { elementId: ctx.id });
    return () => {
      unbind();
      unallow();
    };
  }, [allowModal, boundKeyboard, ctx]);

  return <Text>ModalEl</Text>;
}

function Main() {
  const { skip, gotoScreen, openLayer, applyElement, openModalLayer, applyElementToModalLayer } =
    useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const openSmartLayer = boundKeyboard(['o'], () => {
      openLayer('smart-layer', 10, {
        crossPage: true,
        automaticTakeoverKeyboard: true,
      });
      applyElement('smart-layer', { elementId: 'smart-el', element: LayerEl });
    });
    const openCrossLayer = boundKeyboard(['a'], () => {
      openLayer('cross-layer', 10, { crossPage: true });
      applyElement('cross-layer', { elementId: 'cross-el', element: LayerEl });
    });
    const openPlainLayer = boundKeyboard(['p'], () => {
      openLayer('plain-layer', 10);
      applyElement('plain-layer', { elementId: 'plain-el', element: LayerEl });
    });
    const openSmartModal = boundKeyboard(['n'], () => {
      openModalLayer('smart-modal', 100, {
        crossPage: true,
        automaticTakeoverKeyboard: true,
      });
      applyElementToModalLayer('smart-modal', {
        elementId: 'smart-modal-el',
        element: ModalEl,
      });
    });
    const toGame = boundKeyboard(['s'], () => skip(Game, {}));
    const toGameViaGoto = boundKeyboard(['g'], () => gotoScreen(Game, {}));
    const pageZ = boundKeyboard(['z'], () => handlers.pageZMain());

    return () => {
      openSmartLayer();
      openCrossLayer();
      openPlainLayer();
      openSmartModal();
      toGame();
      toGameViaGoto();
      pageZ();
    };
  }, [
    applyElement,
    applyElementToModalLayer,
    boundKeyboard,
    gotoScreen,
    openLayer,
    openModalLayer,
    skip,
  ]);

  return <Text>Main</Text>;
}

function Game() {
  const {
    skip,
    back,
    gotoScreen,
    openLayer,
    applyElement,
    openModalLayer,
    applyElementToModalLayer,
  } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const openSmartLayer = boundKeyboard(['o'], () => {
      openLayer('smart-layer', 10, {
        crossPage: true,
        automaticTakeoverKeyboard: true,
      });
      applyElement('smart-layer', { elementId: 'smart-el', element: LayerEl });
    });
    const openPlainModal = boundKeyboard(['m'], () => {
      openModalLayer('plain-modal', 100);
      applyElementToModalLayer('plain-modal', {
        elementId: 'plain-modal-el',
        element: ModalEl,
      });
    });
    const toCombat = boundKeyboard(['k'], () => skip(Combat, {}));
    const toCombatViaGoto = boundKeyboard(['r'], () => gotoScreen(Combat, {}));
    const toMain = boundKeyboard(['b'], () => back());
    const pageZ = boundKeyboard(['z'], () => handlers.pageZGame());
    const pageT = boundKeyboard(['t'], () => handlers.pageTGame());

    return () => {
      openSmartLayer();
      openPlainModal();
      toCombat();
      toCombatViaGoto();
      toMain();
      pageZ();
      pageT();
    };
  }, [
    applyElement,
    applyElementToModalLayer,
    back,
    boundKeyboard,
    gotoScreen,
    openLayer,
    openModalLayer,
    skip,
  ]);

  return <Text>Game</Text>;
}

function Combat() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const toGame = boundKeyboard(['b'], () => back());
    const pageZ = boundKeyboard(['z'], () => handlers.pageZCombat());

    return () => {
      toGame();
      pageZ();
    };
  }, [back, boundKeyboard]);

  return <Text>Combat</Text>;
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

async function pressKey(
  stdin: { write: (data: string) => void },
  key: string,
): Promise<void> {
  await act(async () => {
    stdin.write(key);
  });
}

function renderApp() {
  const app = render(
    <ScenarioManagementProvider defaultScreen={Main}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );
  currentUnmount = app.unmount;
  return app;
}

describe('smart persistent layer', () => {
  beforeEach(() => {
    clearRegistry();
    registerComponent(Main, {});
    registerComponent(Game, {}, { parent: Main });
    registerComponent(Combat, {}, { parent: Game });
  });

  afterEach(() => {
    currentUnmount?.();
    currentUnmount = null;
    clearDispatchers();
    vi.clearAllMocks();
  });

  describe('persistent layer', () => {
    it('deactivates the layer keyboard on skip away and reactivates on back', async () => {
      const { stdin, lastFrame } = renderApp();
      await flush();

      await pressKey(stdin, 'o');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(1);
      expect(handlers.pageZMain).not.toHaveBeenCalled();

      await pressKey(stdin, 's');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);
      expect(handlers.layerZ).toHaveBeenCalledTimes(1);
      expect(lastFrame()).toContain('LayerEl');

      await pressKey(stdin, 'b');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(2);
      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);
    });

    it('deactivates via gotoScreen away and reactivates on return', async () => {
      const { stdin } = renderApp();
      await flush();

      await pressKey(stdin, 'o');
      await flush();
      await pressKey(stdin, 'g');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);
      expect(handlers.layerZ).not.toHaveBeenCalled();

      await pressKey(stdin, 'b');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(1);
      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);
    });

    it('keeps intercepting keys on other pages without automaticTakeoverKeyboard', async () => {
      const { stdin, lastFrame } = renderApp();
      await flush();

      await pressKey(stdin, 'a');
      await flush();
      await pressKey(stdin, 'z');
      await flush();
      await pressKey(stdin, 's');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(2);
      expect(handlers.pageZGame).not.toHaveBeenCalled();
      expect(lastFrame()).toContain('LayerEl');
    });

    it('captures the host page at open time, not the root', async () => {
      const { stdin } = renderApp();
      await flush();

      await pressKey(stdin, 's');
      await flush();
      await pressKey(stdin, 'o');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(1);
      expect(handlers.pageZGame).not.toHaveBeenCalled();

      await pressKey(stdin, 'k');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZCombat).toHaveBeenCalledTimes(1);
      expect(handlers.layerZ).toHaveBeenCalledTimes(1);

      await pressKey(stdin, 'b');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(2);
    });

    it('survives skip then gotoScreen then two backs', async () => {
      const { stdin } = renderApp();
      await flush();

      await pressKey(stdin, 'o');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(1);

      await pressKey(stdin, 's');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);

      await pressKey(stdin, 'r');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZCombat).toHaveBeenCalledTimes(1);
      expect(handlers.layerZ).toHaveBeenCalledTimes(1);

      await pressKey(stdin, 'b');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).toHaveBeenCalledTimes(2);

      await pressKey(stdin, 'b');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(2);
    });

    it('removes non-crossPage layers on skip', async () => {
      const { stdin, lastFrame } = renderApp();
      await flush();

      await pressKey(stdin, 'p');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.layerZ).toHaveBeenCalledTimes(1);

      await pressKey(stdin, 's');
      await flush();

      expect(lastFrame()).not.toContain('LayerEl');

      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).toHaveBeenCalledTimes(1);
      expect(handlers.layerZ).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistent modal layer', () => {
    it('blocks every key while dormant away from its host page', async () => {
      const { stdin, lastFrame } = renderApp();
      await flush();

      await pressKey(stdin, 'n');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(1);
      expect(handlers.pageZMain).not.toHaveBeenCalled();

      await act(async () => {
        moduleSkip(Game, {});
      });
      await flush();
      await pressKey(stdin, 'z');
      await flush();
      await pressKey(stdin, 't');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(1);
      expect(handlers.pageZGame).not.toHaveBeenCalled();
      expect(handlers.pageTGame).not.toHaveBeenCalled();
      expect(lastFrame()).toContain('ModalEl');

      await act(async () => {
        moduleBack();
      });
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(2);
    });

    it('goes dormant via gotoScreen and reactivates on return', async () => {
      const { stdin } = renderApp();
      await flush();

      await pressKey(stdin, 'n');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(1);

      await act(async () => {
        moduleGotoScreen(Game, {});
      });
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZGame).not.toHaveBeenCalled();
      expect(handlers.modalZ).toHaveBeenCalledTimes(1);

      await act(async () => {
        moduleGotoScreen(Main, {});
      });
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(2);
    });

    it('removes non-crossPage modal layers on back', async () => {
      const { stdin, lastFrame } = renderApp();
      await flush();

      await act(async () => {
        moduleSkip(Game, {});
      });
      await flush();
      await pressKey(stdin, 'm');
      await flush();
      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.modalZ).toHaveBeenCalledTimes(1);

      await act(async () => {
        moduleBack();
      });
      await flush();

      expect(lastFrame()).not.toContain('ModalEl');

      await pressKey(stdin, 'z');
      await flush();

      expect(handlers.pageZMain).toHaveBeenCalledTimes(1);
      expect(handlers.modalZ).toHaveBeenCalledTimes(1);
    });
  });
});
