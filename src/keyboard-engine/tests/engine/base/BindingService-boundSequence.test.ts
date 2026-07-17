import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('BindingService — boundSequence', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  describe('basic registration', () => {
    test('Given boundSequence with keys and handler, Then sequence is registered', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundSequence(['g', 'g'], handler);
      // Press first key — should not fire yet
      engine.processKey('g', {});
      expect(handler).not.toHaveBeenCalled();
      // Press second key — should fire
      engine.processKey('g', {});
      expect(handler).toHaveBeenCalled();
    });

    test('Given keys.length < 2, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      expect(() => engine.boundSequence(['a'], () => {})).toThrow(
        /at least 2 keys/,
      );
    });
  });

  describe('overload: actionId with preset keys', () => {
    test('Given a registered sequence action with preset keys, boundSequence resolves from actionId', () => {
      const engine = createEngine();
      setup(engine);
      const action = vi.fn();
      engine.defineSequenceAction([
        { sequenceActionId: 'mySeq', action, keys: ['a', 'b'] },
      ]);
      engine.boundSequence('mySeq');
      engine.processKey('a', {});
      engine.processKey('b', {});
      expect(action).toHaveBeenCalled();
    });

    test('Given actionId without preset keys, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      engine.defineSequenceAction([{ sequenceActionId: 'seq', action: () => {} }]);
      expect(() => engine.boundSequence('seq')).toThrow(
        /does not have predefined keys/,
      );
    });
  });

  describe('unbind', () => {
    test('Given unbind function returned, calling it removes the sequence', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      const unbind = engine.boundSequence(['g', 'g'], handler);
      unbind();
      engine.processKey('g', {});
      engine.processKey('g', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('options', () => {
    test('Given exclusive=true, mismatched keys are silently consumed', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      const otherHandler = vi.fn();
      engine.boundSequence(['g', 'g'], handler, { exclusive: true });
      engine.boundKeyboard('x', otherHandler);
      engine.processKey('g', {}); // start sequence
      engine.processKey('x', {}); // mismatch, exclusive → consumed
      expect(otherHandler).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    test('Given focusId, sequence only fires when the focus target is active', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      // Create the focus target via boundKeyboard
      engine.boundKeyboard('x', () => {}, { focusId: 'input1' });
      engine.boundSequence(['a', 'b'], handler, { focusId: 'input1' });
      // Focus is auto-set to 'input1' by boundKeyboard
      expect(engine.focusCurrent().result?.id).toBe('input1');
      engine.processKey('a', {});
      engine.processKey('b', {});
      expect(handler).toHaveBeenCalled();
    });

    test('Given boundSequence with unregistered actionId, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      expect(() => engine.boundSequence('nonexistent')).toThrow(
        /is not registered/,
      );
    });

    test('Given boundSequence with cover=false globalSequence conflict, Then throws', () => {
      const engine = createEngine();
      // Use overlay context for the conflict test
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.globalSequence([
        { keys: ['a', 'b'], operate: () => {}, cover: false, affectOverlay: true },
      ]);
      engine.pushOwner('ov1');
      expect(() => engine.boundSequence(['a', 'b'], () => {})).toThrow(
        /cover: false/,
      );
      engine.popOwner('ov1');
    });

    test('Given boundSequence without any owner, Then throws', () => {
      const engine = createEngine();
      expect(() => engine.boundSequence(['a', 'b'], () => {})).toThrow(
        /must be called inside/,
      );
    });

    test('Given boundSequence with timeout option, Then timeout is stored on binding', () => {
      const engine = createEngine();
      setup(engine);
      engine.boundSequence(['a', 'b'], () => {}, { timeout: 1000 });
      engine.processKey('a', {}); // starts pending
      const layer = engine.readLayer('screenA')!;
      expect(layer.pendingSequence!.timeout).toBe(1000);
    });
  });
});
