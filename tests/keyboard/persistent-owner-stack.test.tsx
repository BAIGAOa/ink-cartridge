import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { clearDispatchers } from '../../src/screen/provider.js';
import { clearShortcutOperations } from '../../src/keyboard/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import { useScreenSystem } from '../../src/screen/hook.js';
import { registerComponent } from '../../src/screen/registry.js';
import {
  Menu,
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

describe('persistent layer owner-stack timing', () => {
  /**
   * When a persistent modal is active on Menu and the user navigates
   * to a new screen, the new screen's mount-effect boundKeyboard must
   * register on the screen's own layer.
   *
   * Without the fix, sibling effect ordering in CurrentScreen causes
   * the target screen's boundKeyboard to pick up the modal's ID as
   * owner — leaking the binding into the modal's inactive layer where
   * the modal processor never consults it.
   *
   * This test exercises the full round-trip: active → skip → screen
   * binding works → back → modal reactivates.
   *
   * @2026-07-04 v3.8.0
   */
  it('screen bindings work after skip from persistent modal', async () => {
    const modal = createTestModal('TestModal', ['s']);
    const targetBack = vi.fn();

    function Target() {
      const kb = useKeyboard();
      const sc = useScreenSystem();
      useEffect(() => {
        return kb.boundKeyboard(['b'], () => {
          targetBack();
          sc.back();
        });
      }, [kb, sc]);
      return <Text>Target</Text>;
    }
    Target.displayName = 'Target';
    registerComponent(Target, {}, { parent: Menu });

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['s'], () => sc.skip(Target, {}));
    });

    await flush();

    // Modal active on origin screen — 'a' reaches modal handler.
    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    // Navigate away via skip — modal becomes inactive.
    await pressKey(stdin, 's');
    await flush();

    // 'b' must reach Target's own layer, not the modal's.
    await pressKey(stdin, 'b');
    await flush();
    expect(targetBack).toHaveBeenCalledTimes(1);
    expect(modal.handler).toHaveBeenCalledTimes(1);

    // Back on Menu — persistent modal reactivates.
    await pressKey(stdin, 'a');
    await flush();
    expect(modal.handler).toHaveBeenCalledTimes(2);
  });

  /**
   * Symmetric regression test for persistent overlays.  The owner-stack
   * timing premise is identical: the overlay's render-phase pop must
   * complete before the target screen's mount effects read the owner.
   *
   * @2026-07-04 v3.8.0
   */
  it('screen bindings work after skip from persistent overlay', async () => {
    const overlay = createTestOverlay('TestOverlay');
    const targetBack = vi.fn();

    function Target() {
      const kb = useKeyboard();
      const sc = useScreenSystem();
      useEffect(() => {
        return kb.boundKeyboard(['b'], () => {
          targetBack();
          sc.back();
        });
      }, [kb, sc]);
      return <Text>Target</Text>;
    }
    Target.displayName = 'Target';
    registerComponent(Target, {}, { parent: Menu });

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      overlay.open(sc, { persistent: true });
      overlay.activate(sc);
      kb.boundKeyboard(['s'], () => sc.skip(Target, {}));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(overlay.handler).toHaveBeenCalledTimes(1);

    await pressKey(stdin, 's');
    await flush();

    await pressKey(stdin, 'b');
    await flush();
    expect(targetBack).toHaveBeenCalledTimes(1);
    expect(overlay.handler).toHaveBeenCalledTimes(1);
  });

  /**
   * Cross-branch gotoScreen variant: the owner-stack pop must happen
   * regardless of whether navigation is sequential (skip) or lateral
   * (gotoScreen).  GotoTarget is registered under Combat, so
   * gotoScreen jumps Menu → GameLevel → Combat → GotoTarget via LCA.
   *
   * After arrival GotoTarget's mount effect runs; its boundKeyboard
   * must resolve to GotoTarget's own layer, not the modal's.
   *
   * @2026-07-04 v3.8.0
   */
  it('screen bindings work after gotoScreen from persistent modal', async () => {
    const modal = createTestModal('GModal', ['g']);
    const gotoBack = vi.fn();

    function GotoTarget() {
      const kb = useKeyboard();
      const sc = useScreenSystem();
      useEffect(() => {
        return kb.boundKeyboard(['b'], () => {
          gotoBack();
          sc.gotoScreen(Menu, {});
        });
      }, [kb, sc]);
      return <Text>GotoTarget</Text>;
    }
    GotoTarget.displayName = 'GotoTarget';
    registerComponent(GotoTarget, {}, { parent: Combat });

    const { stdin } = renderKeyboardApp(Menu, (kb, sc) => {
      modal.open(sc, { persistent: true });
      kb.boundKeyboard(['g'], () => sc.gotoScreen(GotoTarget, {}));
    });

    await flush();

    await pressKey(stdin, 'a');
    expect(modal.handler).toHaveBeenCalledTimes(1);

    // Cross-branch jump — modal goes inactive.
    await pressKey(stdin, 'g');
    await flush();

    // 'b' must reach GotoTarget's layer.
    await pressKey(stdin, 'b');
    await flush();
    expect(gotoBack).toHaveBeenCalledTimes(1);
    expect(modal.handler).toHaveBeenCalledTimes(1);

    // Back on Menu via gotoScreen — modal reactivates.
    await pressKey(stdin, 'a');
    await flush();
    expect(modal.handler).toHaveBeenCalledTimes(2);
  });
});
