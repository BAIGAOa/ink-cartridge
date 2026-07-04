import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearDispatchers,
} from '../../src/screen/provider.js';
import {
  clearShortcutOperations,
} from '../../src/keyboard/provider.js';
import {
  Menu,
  GameLevel,
  Combat,
  setupKeyboardTests,
  flush,
  pressKey,
  renderKeyboardApp,
  createTestOverlay,
  createTestModal,
} from './base/_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

describe('persistent overlay keyboard', () => {
  it('persistent overlay receives keyboard when active on its origin screen', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.boundKeyboard(['a'], screenHandler);
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);
    });

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(0);
  });

  it('persistent overlay loses keyboard after skip navigation', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);

      kb.boundKeyboard(['a'], screenHandler)
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(0);

    await flush();

    await pressKey(stdin, 'o');

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);

  });

  it('persistent overlay loses keyboard after back navigation', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);

      kb.boundKeyboard(['a'], screenHandler)
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
      kb.boundKeyboard(['b'], () => sc.back());
    });

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(0);

    await flush();

    await pressKey(stdin, 'o');

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);

    await flush();

    await pressKey(stdin, 'b');

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(2);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent overlay loses keyboard after gotoScreen navigation', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();
    
    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);

      kb.boundKeyboard(['a'], screenHandler)
      kb.boundKeyboard(['o'], () => sc.gotoScreen(Combat, { enemy: 'goblin' }));
      kb.boundKeyboard(['m'], () => sc.gotoScreen(Menu, {}));
    });

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(0);

    await flush();

    await pressKey(stdin, 'o');

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);

    await flush();

    await pressKey(stdin, 'm');

    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(2);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  })

  it('screen-level keyboard works normally after navigation away from persistent overlay', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');

    expect(overlay.handler).toHaveBeenCalledTimes(0);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('activateOverlay restores keyboard to a persistent overlay after navigation', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
      kb.boundKeyboard(['v'], () => sc.activateOverlay(overlay.id));
    });

    await flush();

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(screenHandler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'v');
    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent overlay closed via closeOverlay no longer receives keyboard', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['c'], () => sc.closeOverlay(overlay.id));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'c');
    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('non-persistent overlay is cleared and loses keyboard on navigation', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: false });
      overlay.activate(sc);
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent and non-persistent overlays coexist: both receive keyboard before navigation', async () => {
    const overlayA = createTestOverlay('OverlayA');
    const overlayB = createTestOverlay('OverlayB');

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlayA.open(sc, { persistent: true });
      overlayA.activate(sc);
      overlayB.open(sc, { persistent: false });
      overlayB.activate(sc);
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(overlayA.handler).toHaveBeenCalledTimes(1);
    expect(overlayB.handler).toHaveBeenCalledTimes(1);
  });
});

describe('persistent modal keyboard', () => {
  it('persistent modal receives keyboard when active on its origin screen', async () => {
    const modal = createTestModal('TestModal');
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      kb.boundKeyboard(['a'], screenHandler);
      modal.open(sc, { persistent: true });
    });

    await flush();

    await pressKey(stdin, 'a');

    expect(modal.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(0);
  });

  it('persistent modal loses keyboard after skip navigation', async () => {
    const modal = createTestModal('TestModal', ['o']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent modal loses keyboard after back navigation', async () => {
    const modal = createTestModal('TestModal', ['o', 'b']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
      kb.boundKeyboard(['b'], () => sc.back());
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(screenHandler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'b');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(2);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent modal loses keyboard after gotoScreen navigation', async () => {
    const modal = createTestModal('TestModal', ['o', 'm']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.gotoScreen(Combat, { enemy: 'goblin' }));
      kb.boundKeyboard(['m'], () => sc.gotoScreen(Menu, {}));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(screenHandler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'm');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(2);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('screen-level keyboard works after navigation away from persistent modal', async () => {
    const modal = createTestModal('TestModal', ['o']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(0);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('persistent modal closed via closeModal no longer receives keyboard', async () => {
    const modal = createTestModal('TestModal', ['c']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['c'], () => sc.closeModal(modal.id));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'c');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('non-persistent modal is cleared and keyboard falls through to screen', async () => {
    const modal = createTestModal('TestModal', ['o']);
    const screenHandler = vi.fn();

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: false });
      kb.boundKeyboard(['a'], screenHandler);
      kb.boundKeyboard(['o'], () => sc.skip(GameLevel, { level: 1 }));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 'o');
    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });
});
