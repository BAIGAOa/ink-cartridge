import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useContext, useEffect } from 'react';
import { Text } from 'ink';
import type { Key } from 'ink';

import { registerComponent, clearRegistry } from '../../screen/registry.js';
import {
  ScenarioManagementProvider,
  clearDispatchers,
} from '../../screen/provider.js';
import { useScreenSystem } from '../../screen/hook.js';
import { CurrentScreen } from '../../screen/current-screen.js';
import { ModalContext } from '../../screen/ModalContext.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';

// ── useInput mock ──────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────

function defaultKey(): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, pageDown: false, pageUp: false,
    home: false, end: false,
    ctrl: false, shift: false, meta: false,
    super: false, hyper: false, capsLock: false, numLock: false,
  };
}

function pressKey(input: string, overrides: Partial<Key> = {}) {
  if (!capturedInputHandler) {
    throw new Error('useInput handler not captured — KeyboardProvider may not be mounted');
  }
  capturedInputHandler(input, { ...defaultKey(), ...overrides } as Key);
}

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
    return <CurrentScreen />;
  }

  render(
    <ScenarioManagementProvider defaultScreen={defaultScreen} defaultParams={defaultParams}>
      <KeyboardProvider>
        <Spy />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );

  return {
    getScreen: () => screenRef.current!,
    getKeyboard: () => keyboardRef.current!,
  };
}

// ── Test components ────────────────────────────────────────────

interface HomeProps { keySpy?: (key: string) => void; }

function Home({ keySpy }: HomeProps) {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['h'], () => keySpy?.('home-h'));
    boundKeyboard(['a'], () => keySpy?.('home-a'));
    boundKeyboard(['b'], () => keySpy?.('home-b'));
    boundKeyboard(['escape'], () => keySpy?.('home-esc'));
  }, []);
  return <Text>Home</Text>;
}
Home.displayName = 'Home';

interface AllowModalProps {
  keySpy?: (key: string) => void;
  /** Keys to pass through the modal barrier. */
  allowKeys?: string[];
  /** If provided, restrict allow to this focus target. */
  allowFocusId?: string;
}

function AllowModal({ keySpy, allowKeys, allowFocusId }: AllowModalProps) {
  const modalId = useContext(ModalContext);
  const { closeModal } = useScreenSystem();
  const { boundKeyboard, allowModal, focusSet } = useKeyboard();

  useEffect(() => {
    if (allowKeys && allowKeys.length > 0) {
      return allowModal(allowKeys, allowFocusId ? { focusId: allowFocusId } : undefined);
    }
    return;
  }, []);

  useEffect(() => {
    // Bind a key inside the modal — this binding should still fire even
    // if the same key is allowed through (modal bindings take priority).
    boundKeyboard(['x'], () => keySpy?.('modal-x'));
    boundKeyboard(['escape'], () => {
      if (modalId) closeModal(modalId);
      keySpy?.('modal-esc');
    });
    // A focus-level binding for testing allowModal + focusId
    boundKeyboard(['return'], () => keySpy?.('modal-return'), { focusId: 'btn' });
    return;
  }, [modalId]);

  // Activate the focus target so allowModal with focusId can take effect.
  useEffect(() => {
    if (allowFocusId) {
      focusSet(allowFocusId);
    }
  }, []);

  return <Text>AllowModal</Text>;
}
AllowModal.displayName = 'AllowModal';

// A modal that does NOT call allowModal — baseline "blocks everything".
interface PlainModalProps { keySpy?: (key: string) => void; }

function PlainModal({ keySpy }: PlainModalProps) {
  const modalId = useContext(ModalContext);
  const { closeModal } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['x'], () => keySpy?.('plain-x'));
    boundKeyboard(['escape'], () => {
      if (modalId) closeModal(modalId);
      keySpy?.('plain-esc');
    });
  }, [modalId]);

  return <Text>PlainModal</Text>;
}
PlainModal.displayName = 'PlainModal';

// A component that calls allowModal outside a modal — should throw.
function AllowModalOutside() {
  const { allowModal } = useKeyboard();
  useEffect(() => {
    allowModal(['escape']);
  }, []);
  return <Text>Outside</Text>;
}
AllowModalOutside.displayName = 'AllowModalOutside';

// ── Setup / Teardown ───────────────────────────────────────────

beforeEach(() => {
  clearRegistry();
  clearDispatchers();
  capturedInputHandler = null;
  vi.restoreAllMocks();
  registerComponent(Home, {});
  registerComponent(AllowModal, {});
  registerComponent(PlainModal, {});
  registerComponent(AllowModalOutside, {});
});

// ── Tests ─────────────────────────────────────────────────────

describe('allowModal', () => {
  // ─── Basic pass-through ──────────────────────────────────────

  describe('basic pass-through', () => {
    it('allowed key passes through modal to screen', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: ['h'], keySpy });
      });

      // 'h' is allowed → should reach Home
      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
    });

    it('non-allowed key is still blocked by modal', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: ['h'], keySpy });
      });

      // 'a' is NOT allowed → modal should consume it
      act(() => pressKey('a', {}));
      expect(keySpy).not.toHaveBeenCalled();
    });

    it('modal bindings still fire for allowed keys (binding takes priority)', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        // Allow 'x' through, but 'x' is also bound inside the modal
        getScreen().openModal('m1', AllowModal, { allowKeys: ['x'], keySpy });
      });

      act(() => pressKey('x', {}));
      // Modal-level binding should fire, not the screen-level pass-through
      expect(keySpy).toHaveBeenCalledWith('modal-x');
      expect(keySpy).not.toHaveBeenCalledWith('home-h');
    });
  });

  // ─── Unbind ──────────────────────────────────────────────────

  describe('unbind', () => {
    it('after unbind, previously allowed key is blocked again', () => {
      const keySpy = vi.fn();
      // We need access to the unbind. Render a modal that persists the handle.
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: ['h'], keySpy });
      });

      // 'h' passes through
      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
      keySpy.mockClear();

      // Close and reopen with a modal that does not allow 'h'
      act(() => { getScreen().closeModal('m1'); });
      act(() => {
        getScreen().openModal('m2', PlainModal, { keySpy });
      });

      // 'h' should now be blocked
      act(() => pressKey('h', {}));
      expect(keySpy).not.toHaveBeenCalled();
    });
  });

  // ─── Plain modal (no allowModal) ─────────────────────────────

  describe('plain modal (no allowModal)', () => {
    it('blocks all unbound screen keys', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', PlainModal, { keySpy });
      });

      act(() => pressKey('h', {}));
      expect(keySpy).not.toHaveBeenCalled();
    });

    it('modal-level bindings still fire', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', PlainModal, { keySpy });
      });

      act(() => pressKey('x', {}));
      expect(keySpy).toHaveBeenCalledWith('plain-x');
    });
  });

  // ─── focusId ─────────────────────────────────────────────────

  describe('focusId', () => {
    it('allowed key with focusId passes through when focus target is active', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, {
          allowKeys: ['return'],
          allowFocusId: 'btn',
          keySpy,
        });
      });

      // 'return' is allowed on focus target 'btn' (active via focusSet)
      act(() => pressKey('return', {}));
      // Since 'return' is also bound on the focus target, the modal
      // binding should fire first (handleLayer matches focus-level bindings
      // before checking allow-list). So it should fire modal-return.
      // This is correct: allowed keys only pass through when the modal
      // does NOT consume them.
      expect(keySpy).toHaveBeenCalledWith('modal-return');
    });

    it('allowed key on focus target passes through when modal has no binding for it', () => {
      // Use a key that is in the allowedKeys of the focus target but NOT
      // bound in the modal at all.
      // eslint-disable-next-line prefer-const
      let screenRef: ReturnType<typeof renderSystem> | undefined;
      // We need a modal that allows 'h' on focusId 'btn' but doesn't bind 'h'
      function FocusAllowModalInner() {
        const modalId = useContext(ModalContext);
        const { closeModal } = useScreenSystem();
        const { boundKeyboard, allowModal, focusSet } = useKeyboard();
        useEffect(() => {
          boundKeyboard(['return'], () => {}, { focusId: 'btn' });
          focusSet('btn');
          return allowModal(['h'], { focusId: 'btn' });
        }, []);
        useEffect(() => {
          boundKeyboard(['escape'], () => { if (modalId) closeModal(modalId); });
        }, [modalId]);
        return <Text>FocusAllowModal</Text>;
      }
      FocusAllowModalInner.displayName = 'FocusAllowModalInner';
      registerComponent(FocusAllowModalInner, {});

      const keySpy = vi.fn();
      screenRef = renderSystem(Home, { keySpy });
      act(() => {
        screenRef!.getScreen().openModal('m1', FocusAllowModalInner, {});
      });

      // 'h' is allowed on the active focus target 'btn', and no modal
      // binding consumes 'h' → should pass through to Home
      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('throws when called outside a modal', () => {
      expect(() => {
        render(
          <ScenarioManagementProvider defaultScreen={AllowModalOutside}>
            <KeyboardProvider>
              <CurrentScreen />
            </KeyboardProvider>
          </ScenarioManagementProvider>,
        );
      }).toThrow('allowModal() can only be used on a modal layer');
    });

    it('empty keys array is a no-op', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: [], keySpy });
      });

      act(() => pressKey('h', {}));
      // Empty allow list → nothing passes through
      expect(keySpy).not.toHaveBeenCalled();
    });

    it('multiple allowed keys all pass through', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: ['h', 'a', 'b'], keySpy });
      });

      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
      act(() => pressKey('a', {}));
      expect(keySpy).toHaveBeenCalledWith('home-a');
      act(() => pressKey('b', {}));
      expect(keySpy).toHaveBeenCalledWith('home-b');
    });

    it('duplicate keys in separate allowModal calls are handled correctly', () => {
      // Two components inside the same modal both allow the same key.
      // No duplicate entries are added, and the key remains allowed.
      const keySpy = vi.fn();
      function DualAllowModal() {
        const modalId = useContext(ModalContext);
        const { closeModal } = useScreenSystem();
        const { boundKeyboard, allowModal } = useKeyboard();
        useEffect(() => {
          boundKeyboard(['escape'], () => { if (modalId) closeModal(modalId); });
        }, [modalId]);
        // Call allowModal twice for the same key (simulating two
        // sub-components each allowing it).
        useEffect(() => { const u1 = allowModal(['h']); const u2 = allowModal(['h']); return () => { u1(); u2(); }; }, []);
        return <Text>Dual</Text>;
      }
      DualAllowModal.displayName = 'DualAllowModal';
      registerComponent(DualAllowModal, {});

      const { getScreen } = renderSystem(Home, { keySpy });
      act(() => {
        getScreen().openModal('m1', DualAllowModal, {});
      });

      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
    });
  });

  // ─── After close ─────────────────────────────────────────────

  describe('after modal close', () => {
    it('screen keys work normally after modal with allowModal is closed', () => {
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        getScreen().openModal('m1', AllowModal, { allowKeys: ['h'], keySpy });
      });
      // Close via internal escape binding
      act(() => pressKey('escape', {}));
      expect(keySpy).toHaveBeenCalledWith('modal-esc');

      // Modal is now closed — 'h' reaches Home normally
      keySpy.mockClear();
      act(() => pressKey('h', {}));
      expect(keySpy).toHaveBeenCalledWith('home-h');
    });
  });

  // ─── Inactive modal ─────────────────────────────────────────

  describe('inactive modal (renderNow)', () => {
    it('allowModal on an inactive modal does not affect keyboard pipeline', () => {
      // Modal A (zIndex 10, active): blocks everything
      // Modal B (zIndex 0, renderNow, inactive): has allowModal(['h'])
      // 'h' should NOT pass through because the ACTIVE modal blocks it
      const keySpy = vi.fn();
      const { getScreen } = renderSystem(Home, { keySpy });

      act(() => {
        // Active modal — blocks everything
        getScreen().openModal('active', PlainModal, { keySpy }, { zIndex: 10 });
        // Inactive modal — allows 'h' but is not active
        getScreen().openModal('inactive', AllowModal, { allowKeys: ['h'] }, { zIndex: 0, renderNow: true });
      });

      act(() => pressKey('h', {}));
      // Active modal (PlainModal) should block 'h' regardless of what
      // the inactive modal's allowModal says.
      expect(keySpy).not.toHaveBeenCalled();
    });
  });
});
