import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  render,
  act,
} from '@testing-library/react';
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  Key,
} from 'ink';
import { OverlayContext } from '../screen/OverlayContext.js';
import { ModalContext } from '../screen/ModalContext.js';
import { useModalMissListener } from '../keyboard/hook.js';

import { CurrentScreen } from '../screen/current-screen.js';
import {
  registerComponent,
  clearRegistry,
} from '../screen/registry.js';
import {
  ScenarioManagementProvider,
} from '../screen/provider.js';
import {
  useScreenSystem,
} from '../screen/hook.js';
import {
  KeyboardProvider,
} from '../keyboard/provider.js';
import {
  useKeyboard,
} from '../keyboard/hook.js';

// Mock useInput from ink — same pattern as existing unit tests.
// Captures the handler so we can simulate key presses without a real terminal.

let capturedInputHandler: ((input: string, key: Key) => void) | null = null;

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  return {
    ...actual,
    useInput: (handler: (input: string, key: Key) => void) => {
      capturedInputHandler = handler;
    },
  };
});

function defaultKey(): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, pageDown: false, pageUp: false,
    home: false, end: false,
    ctrl: false, shift: false, meta: false,
  };
}

function pressKey(input: string, overrides: Partial<Key> = {}) {
  if (!capturedInputHandler) {
    throw new Error('useInput handler not captured');
  }
  capturedInputHandler(input, { ...defaultKey(), ...overrides } as Key);
}

// Test components.
// Each component binds keys and declares navigation behavior in useEffect.
// Spies are injected via props so tests can observe handler calls.

interface MenuProps {
  onMenuE?: () => void;
  onMenuQ?: () => void;
  gameEscapeSpy?: () => void;
}

function Menu({ onMenuE, onMenuQ, gameEscapeSpy }: MenuProps) {
  const { skip, gotoScreen } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['s'], () => skip(Game, { onEscape: gameEscapeSpy }));
    boundKeyboard(['e'], () => onMenuE?.());
    boundKeyboard(['q'], () => onMenuQ?.());
    boundKeyboard(['x'], () => gotoScreen(Settings, {}));
  }, []);
  return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

interface GameProps {
  onEscape?: () => void;
}

function Game({ onEscape }: GameProps) {
  const { back, skip, openOverlay } = useScreenSystem();
  const { boundKeyboard, blockedKey, stop } = useKeyboard();

  useEffect(() => {
    blockedKey(['e']);
    stop(['q']);
    boundKeyboard(['b'], () => back());
    boundKeyboard(['i'], () => skip(Inventory, {}));
    boundKeyboard(['o'], () => openOverlay('pause-ovl', PauseOverlay, {}));
    // For scenario 5: Game binds escape, but overlay's escape should win.
    boundKeyboard(['escape'], () => onEscape?.());
  }, []);
  return React.createElement('div', null, 'Game');
}
Game.displayName = 'Game';

function Inventory() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['b'], () => back());
  }, []);
  return React.createElement('div', null, 'Inventory');
}
Inventory.displayName = 'Inventory';

function PauseOverlay() {
  const overlayId = useContext(OverlayContext);
  const { closeOverlay } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['escape'], () => closeOverlay(overlayId!));
  }, []);
  return React.createElement('div', null, 'PauseOverlay');
}
PauseOverlay.displayName = 'PauseOverlay';

function Settings() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['b'], () => back());
    boundKeyboard(['1'], () => {}, { focusId: 'name-input' });
    boundKeyboard(['2'], () => {}, { focusId: 'difficulty-select' });
  }, []);
  return React.createElement('div', null, 'Settings');
}
Settings.displayName = 'Settings';

// Sequence-aware component: binds both a normal key and a two-key sequence
// (Vim-like 'gg' to trigger the provided spy).
interface VimMenuProps {
  onGgSpy?: () => void;
  onOrdinaryG?: () => void;
}

function VimMenu({ onGgSpy, onOrdinaryG }: VimMenuProps) {
  const { boundKeyboard, boundSequence } = useKeyboard();

  useEffect(() => {
    boundSequence(['g', 'g'], () => onGgSpy?.());
    boundKeyboard(['g'], () => onOrdinaryG?.());
  }, []);
  return React.createElement('div', null, 'VimMenu');
}
VimMenu.displayName = 'VimMenu';

// Overlay component that exposes a sequence binding.
interface SeqOverlayProps {
  onSeqSpy?: () => void;
}

function SeqOverlay({ onSeqSpy }: SeqOverlayProps) {
  const overlayId = useContext(OverlayContext);
  const { closeOverlay } = useScreenSystem();
  const { boundKeyboard, boundSequence } = useKeyboard();

  useEffect(() => {
    boundSequence(['q', 'q'], () => onSeqSpy?.());
    boundKeyboard(['escape'], () => closeOverlay(overlayId!));
  }, []);
  return React.createElement('div', null, 'SeqOverlay');
}
SeqOverlay.displayName = 'SeqOverlay';

// Modal that binds keys and uses miss listener to report unhandled keys.
interface ModalPanelProps {
  onMiss?: (evt: { miss: boolean; key?: Key; input?: string }) => void;
  onModalKey?: () => void;
  missOptions?: { monitorWhen?: boolean; monitorFocusMismatch?: boolean };
}

function ModalPanel({ onMiss, onModalKey, missOptions }: ModalPanelProps) {
  const modalId = useContext(ModalContext);
  const { closeModal } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useModalMissListener(
    (evt) => {
      onMiss?.(evt);
    },
    missOptions,
  );

  useEffect(() => {
    const u1 = boundKeyboard(['escape'], () => closeModal(modalId!));
    const u2 = boundKeyboard(['m'], () => onModalKey?.());
    return () => { u1(); u2(); };
  }, []);

  return React.createElement('div', null, 'ModalPanel');
}
ModalPanel.displayName = 'ModalPanel';

// Screen that can open a modal via keyboard.
interface ModalScreenProps {
  onGlobalKey?: () => void;
  onScreenKey?: () => void;
  modalProps?: ModalPanelProps;
}

function ModalScreen({ onGlobalKey, onScreenKey, modalProps }: ModalScreenProps) {
  const { skip } = useScreenSystem();
  const { boundKeyboard, globalKeys } = useKeyboard();

  useEffect(() => {
    // Global key registered at this screen level.
    // globalKeys returns void — entries are persisted in a ref.
    if (onGlobalKey) {
      globalKeys([
        { key: 'g', operate: () => onGlobalKey(), cover: true },
      ], { mode: 'add' });
    }
  }, []);

  useEffect(() => {
    const u1 = boundKeyboard(['o'], () => skip(ModalScreen, {}));
    if (onScreenKey) {
      const u2 = boundKeyboard(['s'], () => onScreenKey());
      return () => { u1(); u2(); };
    }
    return () => { u1(); };
  }, []);

  return React.createElement('div', null, 'ModalScreen');
}
ModalScreen.displayName = 'ModalScreen';

// Screen that manages multiple overlays.
interface MultiOverlayScreenProps {
  overlay1Id?: string;
  overlay2Id?: string;
}

function MultiOverlayScreen({ overlay1Id = 'ov1', overlay2Id = 'ov2' }: MultiOverlayScreenProps) {
  const { openOverlay, closeOverlay } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const u1 = boundKeyboard(['1'], () => openOverlay(overlay1Id, SimpleOverlay, { label: 'A' }));
    const u2 = boundKeyboard(['2'], () => openOverlay(overlay2Id, SimpleOverlay, { label: 'B' }));
    const u3 = boundKeyboard(['q'], () => {
      closeOverlay(overlay1Id);
      closeOverlay(overlay2Id);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  return React.createElement('div', null, 'MultiOverlayScreen');
}
MultiOverlayScreen.displayName = 'MultiOverlayScreen';

interface SimpleOverlayProps {
  label?: string;
}

function SimpleOverlay({ label }: SimpleOverlayProps) {
  const overlayId = useContext(OverlayContext);
  const { closeOverlay } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const u1 = boundKeyboard(['x'], () => closeOverlay(overlayId!));
    return () => u1();
  }, []);

  return React.createElement('div', null, label ?? 'SimpleOverlay');
}
SimpleOverlay.displayName = 'SimpleOverlay';

// Screen using globalKeys with category filtering.
interface CategoryScreenProps {
  onCategoryMatch?: () => void;
  onNoMatch?: () => void;
}

function CategoryScreen({ onCategoryMatch }: CategoryScreenProps) {
  const { boundKeyboard, globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      { key: 'c', operate: () => onCategoryMatch?.(), category: [CategoryScreen], cover: true },
    ], { mode: 'add' });
  }, []);

  useEffect(() => {
    const u1 = boundKeyboard(['t'], () => onCategoryMatch?.());
    return () => u1();
  }, []);

  return React.createElement('div', null, 'CategoryScreen');
}
CategoryScreen.displayName = 'CategoryScreen';

// VimMenu variant that also supports ctrl+d and boundSequence together.
interface VimCtrlScreenProps {
  onCtrlD?: () => void;
  onSeqDone?: () => void;
}

function VimCtrlScreen({ onCtrlD, onSeqDone }: VimCtrlScreenProps) {
  const { boundKeyboard, boundSequence } = useKeyboard();

  useEffect(() => {
    boundSequence(['d', 'v'], () => onSeqDone?.());
    boundKeyboard(['ctrl+d'], () => onCtrlD?.());
    boundKeyboard(['d'], () => {}); // bare 'd' has a handler but shouldn't fire on ctrl+d
  }, []);

  return React.createElement('div', null, 'VimCtrlScreen');
}
VimCtrlScreen.displayName = 'VimCtrlScreen';

// Render helper — mounts both providers and captures hook APIs via refs.
// CurrentScreen is rendered so that screen component effects actually run.

function renderSystem(
  defaultScreen: React.ComponentType<any>,
  defaultParams?: Record<string, unknown>,
) {
  const screenRef: { current: ReturnType<typeof useScreenSystem> | null } = { current: null };
  const keyboardRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function Spy() {
    const sc = useScreenSystem();
    const kb = useKeyboard();
    screenRef.current = sc;
    keyboardRef.current = kb;
    useEffect(() => {
      screenRef.current = sc;
      keyboardRef.current = kb;
    }, [sc, kb]);
    return React.createElement(CurrentScreen);
  }

  render(
    React.createElement(
      ScenarioManagementProvider,
      { defaultScreen, defaultParams },
      React.createElement(KeyboardProvider, null, React.createElement(Spy)),
    ),
  );

  return {
    getScreen: () => screenRef.current,
    getKeyboard: () => keyboardRef.current,
  };
}

beforeEach(() => {
  clearRegistry();
  capturedInputHandler = null;

  registerComponent(Menu, {});
  registerComponent(Game, {}, { parent: Menu });
  registerComponent(Inventory, {}, { parent: Game });
  registerComponent(Settings, {}, { parent: Menu });
  registerComponent(PauseOverlay, {});
  registerComponent(VimMenu, {}, { parent: Menu });
  registerComponent(SeqOverlay, {});
  registerComponent(ModalPanel, {});
  registerComponent(ModalScreen, {}, { parent: Menu });
  registerComponent(MultiOverlayScreen, {}, { parent: Menu });
  registerComponent(SimpleOverlay, {});
  registerComponent(CategoryScreen, {}, { parent: Menu });
  registerComponent(VimCtrlScreen, {}, { parent: Menu });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('场景 1：基础全流程 — 按键驱动 skip / back', () => {
  it('Menu → Game → Menu', () => {
    const { getScreen } = renderSystem(Menu);

    expect(getScreen()!.currentPath).toEqual([Menu]);

    act(() => pressKey('s', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);

    act(() => pressKey('b', {}));
    expect(getScreen()!.currentPath).toEqual([Menu]);
  });

  it('Menu → Game → Inventory → Game', () => {
    const { getScreen } = renderSystem(Menu);

    act(() => pressKey('s', {}));
    act(() => pressKey('i', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game, Inventory]);

    act(() => pressKey('b', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);
  });
});

describe('场景 2：责任链冒泡 — 栈顶无绑定则下层处理', () => {
  it('Inventory 和 Game 未绑 e，Menu 的 e 触发', () => {
    const menuE = vi.fn();
    const { getScreen } = renderSystem(Menu, { onMenuE: menuE });

    act(() => pressKey('s', {}));
    act(() => pressKey('i', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game, Inventory]);

    act(() => pressKey('e', {}));
    expect(menuE).toHaveBeenCalledTimes(1);
  });
});

describe('场景 3：blockedKey 穿透', () => {
  it('Game blockedKey e，Menu 的 e 仍触发', () => {
    const menuE = vi.fn();
    const { getScreen } = renderSystem(Menu, { onMenuE: menuE });

    act(() => pressKey('s', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);

    act(() => pressKey('e', {}));
    expect(menuE).toHaveBeenCalledTimes(1);
  });
});

describe('场景 4：stop 阻断 — q 被 Game 拦截', () => {
  it('Game stop q，Menu 的 q 不触发', () => {
    const menuQ = vi.fn();
    const { getScreen } = renderSystem(Menu, { onMenuQ: menuQ });

    act(() => pressKey('s', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);

    act(() => pressKey('q', {}));
    expect(menuQ).not.toHaveBeenCalled();
  });
});

describe('场景 5：Overlay 优先级 — overlay 的 escape 优先于屏幕', () => {
  it('overlay 打开时按 Escape，overlay 关闭，Game 的 escape 不触发', () => {
    const gameEscapeSpy = vi.fn();
    const { getScreen } = renderSystem(Menu, { gameEscapeSpy });

    act(() => pressKey('s', {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);

    act(() => pressKey('o', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(1);
    expect(getScreen()!.currentPath).toEqual([Menu, Game]);

    act(() => pressKey('', { escape: true }));

    expect(getScreen()!.displayedOverlays.length).toBe(0);
    expect(gameEscapeSpy).not.toHaveBeenCalled();
  });

  it('overlay 关闭后，Game 的 escape 正常工作', () => {
    const gameEscapeSpy = vi.fn();
    const { getScreen } = renderSystem(Menu, { gameEscapeSpy });

    act(() => pressKey('s', {}));

    act(() => getScreen()!.openOverlay('pause-2', PauseOverlay, {}));
    expect(getScreen()!.displayedOverlays.length).toBe(1);

    act(() => getScreen()!.closeOverlay('pause-2'));
    expect(getScreen()!.displayedOverlays.length).toBe(0);

    act(() => pressKey('', { escape: true }));
    expect(gameEscapeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('场景 6：GlobalKeys — cover 字段', () => {
  it('cover: false 时 boundKeyboard 抛错', () => {
    const { getKeyboard } = renderSystem(Menu);

    getKeyboard()!.globalKeys([
      { key: 'z', operate: () => {}, cover: false },
    ]);

    expect(() => {
      getKeyboard()!.boundKeyboard(['z'], () => {});
    }).toThrow('cover: false');
  });

  it('cover: true 时屏幕可以覆盖全局键，全局键不触发', () => {
    const globalFn = vi.fn();
    const screenFn = vi.fn();
    const { getKeyboard } = renderSystem(Menu);

    getKeyboard()!.globalKeys([
      { key: 'z', operate: globalFn, cover: true },
    ]);
    getKeyboard()!.boundKeyboard(['z'], screenFn);

    act(() => pressKey('z', {}));
    expect(screenFn).toHaveBeenCalledTimes(1);
    expect(globalFn).not.toHaveBeenCalled();
  });
});

describe('场景 7：Focus — Tab 切换 focus target', () => {
  it('Tab 正向循环', () => {
    const { getScreen, getKeyboard } = renderSystem(Menu);

    act(() => getScreen()!.gotoScreen(Settings, {}));
    expect(getScreen()!.currentPath).toEqual([Menu, Settings]);

    expect(getKeyboard()!.focusCurrent()).toBe('name-input');

    act(() => pressKey('', { tab: true }));
    expect(getKeyboard()!.focusCurrent()).toBe('difficulty-select');

    act(() => pressKey('', { tab: true }));
    expect(getKeyboard()!.focusCurrent()).toBe('name-input');
  });

  it('Shift+Tab 逆向', () => {
    const { getScreen, getKeyboard } = renderSystem(Menu);

    act(() => getScreen()!.gotoScreen(Settings, {}));

    expect(getKeyboard()!.focusCurrent()).toBe('name-input');

    act(() => pressKey('', { tab: true, shift: true }));
    expect(getKeyboard()!.focusCurrent()).toBe('difficulty-select');
  });

  it('focusSet 直接切换', () => {
    const { getScreen, getKeyboard } = renderSystem(Menu);

    act(() => getScreen()!.gotoScreen(Settings, {}));

    getKeyboard()!.focusSet('difficulty-select');
    expect(getKeyboard()!.focusCurrent()).toBe('difficulty-select');
  });
});

describe('场景 8：boundSequence 集成 — 序列 + 屏幕导航', () => {
  it('"gg" 完成序列后触发回调，单次 "g" 不触发序列回调', () => {
    const ggSpy = vi.fn();
    const ordinaryG = vi.fn();
    const { getScreen } = renderSystem(VimMenu, { onGgSpy: ggSpy, onOrdinaryG: ordinaryG });

    // 单次 g：被序列消费（启动待匹配），序列回调不触发，普通 g 绑定也不触���
    act(() => pressKey('g', {}));
    expect(ggSpy).not.toHaveBeenCalled();
    expect(ordinaryG).not.toHaveBeenCalled();

    // 完成序列
    act(() => pressKey('g', {}));
    expect(ggSpy).toHaveBeenCalledTimes(1);
    expect(ordinaryG).not.toHaveBeenCalled();
  });

  it('"gg" 序列不匹配时，取消序列并触发普通绑定', () => {
    const ggSpy = vi.fn();
    const ordinaryG = vi.fn();
    renderSystem(VimMenu, { onGgSpy: ggSpy, onOrdinaryG: ordinaryG });

    act(() => pressKey('g', {})); // 启动序列
    act(() => pressKey('x', {})); // 不匹配 → 取消序列，x 应该匹配正常绑定...但 VimMenu 没有 x 绑定
    // 序列被取消，ordinaryG 还没触发

    act(() => pressKey('g', {})); // 新序列开始
    act(() => pressKey('g', {})); // 完成
    expect(ggSpy).toHaveBeenCalledTimes(1);
  });

  it('序列匹配期间按错键后，重新开始序列仍可成功', () => {
    const ggSpy = vi.fn();
    const ordinaryG = vi.fn();
    renderSystem(VimMenu, { onGgSpy: ggSpy, onOrdinaryG: ordinaryG });

    // First attempt: g + x (cancel)
    act(() => pressKey('g', {}));
    act(() => pressKey('x', {}));

    // Second attempt: gg (success)
    act(() => pressKey('g', {}));
    act(() => pressKey('g', {}));
    expect(ggSpy).toHaveBeenCalledTimes(1);
  });

  it('序列 + 屏幕导航：跳转到其他屏幕时 pending 序列被清除', () => {
    const ggSpy = vi.fn();
    const { getScreen } = renderSystem(Menu);

    // Navigate to VimMenu (child of Menu)
    act(() => getScreen()!.skip(VimMenu, { onGgSpy: ggSpy }));

    act(() => pressKey('g', {})); // pending

    // Navigate back to Menu — clears pending sequence via layer deletion
    act(() => getScreen()!.back());

    // Go back to VimMenu
    act(() => getScreen()!.skip(VimMenu, { onGgSpy: ggSpy }));
    act(() => pressKey('g', {})); // new sequence on fresh layer
    act(() => pressKey('g', {}));
    // The second gg should complete fresh, not from old pending
    expect(ggSpy).toHaveBeenCalledTimes(1);
  });
});

describe('场景 9：boundSequence + Overlay 集成', () => {
  it('overlay 中的 "qq" 序列在 overlay 打开时正常工作', () => {
    const qqSpy = vi.fn();
    const { getScreen } = renderSystem(Menu);

    act(() => getScreen()!.openOverlay('seq-ov1', SeqOverlay, { onSeqSpy: qqSpy }));
    expect(getScreen()!.displayedOverlays.length).toBe(1);

    act(() => pressKey('q', {}));
    act(() => pressKey('q', {}));
    expect(qqSpy).toHaveBeenCalledTimes(1);
  });

  it('overlay 关闭后序列绑定不再生效', () => {
    const qqSpy = vi.fn();
    const { getScreen } = renderSystem(Menu);

    act(() => getScreen()!.openOverlay('seq-ov2', SeqOverlay, { onSeqSpy: qqSpy }));
    act(() => getScreen()!.closeOverlay('seq-ov2'));
    expect(getScreen()!.displayedOverlays.length).toBe(0);

    act(() => pressKey('q', {}));
    act(() => pressKey('q', {}));
    expect(qqSpy).not.toHaveBeenCalled();
  });

  it('overlay 序列的 escape 仍能关闭 overlay（序列 + 普通键共存）', () => {
    const qqSpy = vi.fn();
    const { getScreen } = renderSystem(Menu);

    act(() => getScreen()!.openOverlay('seq-ov3', SeqOverlay, { onSeqSpy: qqSpy }));

    // Start a sequence
    act(() => pressKey('q', {}));

    // Press escape to close overlay — cancels pending sequence
    act(() => pressKey('', { escape: true }));
    expect(getScreen()!.displayedOverlays.length).toBe(0);

    // Sequence should NOT have fired
    expect(qqSpy).not.toHaveBeenCalled();
  });
});

describe('场景 10：boundSequence + blockedKey / stop 交互', () => {
  it('序列在 VimMenu 上正常完成，普通 boundKeyboard 不受影响', () => {
    const ggSpy = vi.fn();
    const ordinaryG = vi.fn();
    renderSystem(VimMenu, { onGgSpy: ggSpy, onOrdinaryG: ordinaryG });

    // Press 'g' three times: first starts seq, second completes seq, third starts new seq
    act(() => pressKey('g', {}));
    act(() => pressKey('g', {}));
    expect(ggSpy).toHaveBeenCalledTimes(1);
    expect(ordinaryG).not.toHaveBeenCalled();

    act(() => pressKey('g', {})); // new pending
    act(() => pressKey('x', {})); // cancel, x not bound on VimMenu
    // The pending was cancelled, now another 'g' starts fresh
    act(() => pressKey('g', {}));
    act(() => pressKey('g', {}));
    expect(ggSpy).toHaveBeenCalledTimes(2);
  });
});

// Complex integration scenarios — multi-system interaction tests.

describe('场景 11：Modal + globalKeys / boundKeyboard 优先级', () => {
  it('modal 打开时 globalKeys 不触发，modal 关闭后恢复', () => {
    const globalFn = vi.fn();
    const modalKey = vi.fn();
    const { getScreen, getKeyboard } = renderSystem(Menu);

    getKeyboard()!.globalKeys([
      { key: 'g', operate: globalFn, cover: true },
    ]);

    // Before modal: global key works
    act(() => pressKey('g', {}));
    expect(globalFn).toHaveBeenCalledTimes(1);

    // Open modal
    act(() => {
      getScreen()!.openModal('m1', ModalPanel, { onModalKey: modalKey });
    });

    // Modal blocks globalKeys
    globalFn.mockClear();
    act(() => pressKey('g', {}));
    expect(globalFn).not.toHaveBeenCalled();

    // Close modal with escape
    act(() => pressKey('', { escape: true }));

    // Global key recovers
    act(() => pressKey('g', {}));
    expect(globalFn).toHaveBeenCalledTimes(1);
  });

  it('modal 内部 boundKeyboard 正常工作，外部 boundKeyboard 被阻断', () => {
    const modalKey = vi.fn();
    const screenKey = vi.fn();
    const { getScreen } = renderSystem(ModalScreen, {
      onScreenKey: screenKey,
    });

    // Bind a screen-level key
    act(() => pressKey('s', {}));
    expect(screenKey).toHaveBeenCalledTimes(1);

    // Open modal via screen system
    act(() => {
      getScreen()!.openModal('m1', ModalPanel, {
        onModalKey: modalKey,
      });
    });

    // Now 's' is blocked by modal
    screenKey.mockClear();
    act(() => pressKey('s', {}));
    expect(screenKey).not.toHaveBeenCalled();

    // 'm' works in modal
    act(() => pressKey('m', {}));
    expect(modalKey).toHaveBeenCalledTimes(1);

    // 'escape' closes modal
    act(() => pressKey('', { escape: true }));
    // Modal closed — verify by checking screen key works again
    screenKey.mockClear();
    act(() => pressKey('s', {}));
    expect(screenKey).toHaveBeenCalledTimes(1);
  });

  it('modal miss listener 报告未绑定的键', () => {
    const onMiss = vi.fn();
    const { getScreen } = renderSystem(Menu);

    act(() => {
      getScreen()!.openModal('m1', ModalPanel, {
        onMiss,
        onModalKey: () => {},
      });
    });

    // 'z' is not bound in modal → miss
    act(() => pressKey('z', {}));
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true }),
    );

    // 'm' is bound in modal → not a miss
    onMiss.mockClear();
    act(() => pressKey('m', {}));
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: false }),
    );
  });
});

describe('场景 12：Modal 与 Overlay 共存', () => {
  it('modal 打开时 overlay 的按键被阻断', () => {
    const overlayCloseSpy = vi.fn();
    const { getScreen } = renderSystem(MultiOverlayScreen);

    // Open an overlay first
    act(() => pressKey('1', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(1);

    // Open modal on top
    act(() => {
      getScreen()!.openModal('m1', ModalPanel, { onModalKey: overlayCloseSpy });
    });

    // Overlay's 'x' key should be blocked by modal
    // (modal consumes all events)
    act(() => pressKey('x', {}));
    // Overlay should still be open
    expect(getScreen()!.displayedOverlays.length).toBe(1);

    // Close modal with escape
    act(() => pressKey('', { escape: true }));

    // Now overlay's 'x' works
    act(() => pressKey('x', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(0);
  });
});

describe('场景 13：多 Overlay + globalKeys(affectOverlay) 优先级', () => {
  it('affectOverlay: true 的 globalKeys 在 overlay 阶段触发，无 overlay 时不触发', () => {
    const globalAffectFn = vi.fn();
    const globalNoAffectFn = vi.fn();
    const { getScreen, getKeyboard } = renderSystem(MultiOverlayScreen);

    getKeyboard()!.globalKeys([
      { key: 'g', operate: globalAffectFn, cover: true, affectOverlay: true },
    ], { mode: 'add' });
    getKeyboard()!.globalKeys([
      { key: 'h', operate: globalNoAffectFn, cover: true, affectOverlay: false },
    ], { mode: 'add' });

    // No overlay → affectOverlay: true does NOT fire
    act(() => pressKey('g', {}));
    expect(globalAffectFn).not.toHaveBeenCalled();

    // No overlay → affectOverlay: false fires in screen stage
    act(() => pressKey('h', {}));
    expect(globalNoAffectFn).toHaveBeenCalledTimes(1);

    // Open an overlay
    act(() => pressKey('1', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(1);

    // affectOverlay: true → fires when overlay is active
    act(() => pressKey('g', {}));
    expect(globalAffectFn).toHaveBeenCalledTimes(1);

    // Close overlay
    act(() => pressKey('x', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(0);

    // Overlay gone → affectOverlay: true stops firing again
    globalAffectFn.mockClear();
    act(() => pressKey('g', {}));
    expect(globalAffectFn).not.toHaveBeenCalled();
  });

  it('多个 overlay 打开时，按键广播到所有 overlay，一次按键全部关闭', () => {
    const { getScreen } = renderSystem(MultiOverlayScreen);

    // Open two overlays
    act(() => pressKey('1', {}));
    act(() => pressKey('2', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(2);

    // Both overlays bind 'x' to close themselves. The overlay processor
    // broadcasts to all overlays, so both consume 'x' and close.
    act(() => pressKey('x', {}));
    expect(getScreen()!.displayedOverlays.length).toBe(0);
  });
});

describe('场景 14：ctrl/meta 修饰符 + boundSequence 集成', () => {
  it('ctrl+d 不触发裸键序列 ["d","v"]，触发 boundKeyboard(["ctrl+d"])', () => {
    const ctrlDSpy = vi.fn();
    const seqSpy = vi.fn();
    const { getScreen } = renderSystem(VimCtrlScreen, {
      onCtrlD: ctrlDSpy,
      onSeqDone: seqSpy,
    });

    // Press ctrl+d — should fire boundKeyboard, not the sequence
    act(() => pressKey('d', { ctrl: true }));
    expect(ctrlDSpy).toHaveBeenCalledTimes(1);
    expect(seqSpy).not.toHaveBeenCalled();
  });

  it('meta+d 不触发裸键序列', () => {
    const ctrlDSpy = vi.fn();
    const seqSpy = vi.fn();
    const { getScreen } = renderSystem(VimCtrlScreen, {
      onCtrlD: ctrlDSpy,
      onSeqDone: seqSpy,
    });

    // Note: VimCtrlScreen binds ctrl+d, not meta+d.
    // meta+d goes through unbind → miss. But the sequence should NOT start.
    act(() => pressKey('d', { meta: true }));
    expect(seqSpy).not.toHaveBeenCalled();

    // Follow up with 'v' — should not complete sequence
    act(() => pressKey('v', {}));
    expect(seqSpy).not.toHaveBeenCalled();
  });

  it('裸键 "d","v" 序列在无修饰符时正常完成', () => {
    const ctrlDSpy = vi.fn();
    const seqSpy = vi.fn();
    const { getScreen } = renderSystem(VimCtrlScreen, {
      onCtrlD: ctrlDSpy,
      onSeqDone: seqSpy,
    });

    // Bare 'd' starts sequence, then 'v' completes
    act(() => pressKey('d', {}));
    act(() => pressKey('v', {}));
    expect(seqSpy).toHaveBeenCalledTimes(1);
    expect(ctrlDSpy).not.toHaveBeenCalled();
  });
});

describe('场景 15：globalKeys category + 屏幕导航', () => {
  it('category 过滤的 globalKeys 只在匹配的屏幕触发', () => {
    const categoryFn = vi.fn();
    const { getScreen } = renderSystem(Menu);

    // Navigate to CategoryScreen
    act(() => getScreen()!.skip(CategoryScreen, { onCategoryMatch: categoryFn }));

    // Global key 'c' with category=[CategoryScreen] fires here
    act(() => pressKey('c', {}));
    expect(categoryFn).toHaveBeenCalledTimes(1);

    // Navigate back to Menu — category key should not fire
    act(() => getScreen()!.back());
    categoryFn.mockClear();

    act(() => pressKey('c', {}));
    expect(categoryFn).not.toHaveBeenCalled();
  });
});
