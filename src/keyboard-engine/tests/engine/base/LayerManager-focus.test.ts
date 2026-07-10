import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('LayerManager — focus', () => {
  function setupScreen(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  describe('focusSet', () => {
    test('Given focusSet called with a focusId previously registered via boundKeyboard, Then currentFocusId is set', () => {
      const engine = createEngine();
      setupScreen(engine);
      // Create a focus target by binding with focusId
      engine.boundKeyboard('x', () => {}, { focusId: 'input1' });
      // Now focusSet should work
      engine.focusSet('input1');
      expect(engine.focusCurrent()).toBe('input1');
    });

    test('Given boundKeyboard creates focus targets, focusSet switches between them', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'input1' });
      engine.boundKeyboard('b', () => {}, { focusId: 'input2' });
      engine.focusSet('input2');
      expect(engine.focusCurrent()).toBe('input2');
      engine.focusSet('input1');
      expect(engine.focusCurrent()).toBe('input1');
    });

    test('Given no current owner (no screen path), focusSet is a no-op (does not throw)', () => {
      const engine = createEngine();
      engine.focusSet('input1');
      expect(engine.focusCurrent()).toBeNull();
    });

    test('Given owner exists but no layer created, focusSet throws layer-not-found error', () => {
      const engine = createEngine();
      // Sync to set up path but DON'T call boundKeyboard — no layer is created
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      expect(() => engine.focusSet('input1')).toThrow(
        /no keyboard layer found/,
      );
    });

    test('Given focusSet with unregistered id on a layer that exists, Then throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      // Create a layer first by binding a key without focusId
      engine.boundKeyboard('x', () => {});
      expect(() => engine.focusSet('nonexistent')).toThrow(
        /focus target not found/,
      );
    });
  });

  describe('focusNext / focusPrev', () => {
    test('Given focus targets exist, focusNext cycles through them', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.boundKeyboard('c', () => {}, { focusId: 'c' });
      // first registered focusId is auto-selected
      engine.focusNext();
      expect(engine.focusCurrent()).toBe('b');
      engine.focusNext();
      expect(engine.focusCurrent()).toBe('c');
      engine.focusNext();
      expect(engine.focusCurrent()).toBe('a');
    });

    test('Given focus targets, focusPrev cycles backward', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.boundKeyboard('c', () => {}, { focusId: 'c' });
      engine.focusPrev();
      expect(engine.focusCurrent()).toBe('c');
    });

    test('Given no focus targets, focusNext is safe (no-op)', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.focusNext();
      expect(engine.focusCurrent()).toBeNull();
    });

    test('Given no current owner, focusNext does not throw', () => {
      const engine = createEngine();
      engine.focusNext();
      expect(engine.focusCurrent()).toBeNull();
    });
  });

  describe('focusUnregister', () => {
    test('Given focusUnregister removes the active target, Then next target is auto-selected', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.focusUnregister('a');
      expect(engine.focusCurrent()).toBe('b');
    });

    test('Given focusUnregister removes the only target, Then currentFocusId becomes null', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'only' });
      engine.focusUnregister('only');
      expect(engine.focusCurrent()).toBeNull();
    });
  });

  describe('subscribeFocus', () => {
    test('Given a subscriber registered, Then it is notified on focusSet', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      engine.boundKeyboard('y', () => {}, { focusId: 'b' });
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      engine.focusSet('b');
      expect(listener).toHaveBeenCalled();
    });

    test('Given unsubscribe is called, Then listener is no longer notified', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      const listener = vi.fn();
      const unsubscribe = engine.subscribeFocus(listener);
      unsubscribe();
      engine.focusSet('a');
      expect(listener).not.toHaveBeenCalled();
    });

    test('Given boundKeyboard with focusId auto-selects first focus target, subscriber is notified', () => {
      const engine = createEngine();
      setupScreen(engine);
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      // first focus target auto-select triggers notification
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      expect(listener).toHaveBeenCalled();
    });
  });
});
