import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('OperationRegistry — globalSequence', () => {
  describe('basic registration', () => {
    test('Given globalSequence with entries, Then getGlobalSequences returns them', () => {
      const engine = createEngine();
      engine.globalSequence([{ keys: ['g', 'g'], operate: () => {} }]);
      expect(engine.getGlobalSequences()).toHaveLength(1);
    });

    test('Given keys.length < 2, Then throws', () => {
      const engine = createEngine();
      expect(() =>
        engine.globalSequence([{ keys: ['a'], operate: () => {} }]),
      ).toThrow(/at least 2 keys/);
    });
  });

  describe('replace vs add mode', () => {
    test('Given default (replace) mode, Then second call replaces all entries', () => {
      const engine = createEngine();
      engine.globalSequence([{ keys: ['a', 'b'], operate: () => {} }]);
      engine.globalSequence([{ keys: ['c', 'd'], operate: () => {} }]);
      expect(engine.getGlobalSequences()).toHaveLength(1);
      expect(engine.getGlobalSequences()[0].keys).toEqual(['c', 'd']);
    });

    test('Given replace mode with pending global sequence, Then pending is cancelled', () => {
      const engine = createEngine();
      engine.globalSequence([{ keys: ['a', 'b'], operate: () => {} }]);
      // Force start a pending global sequence by processing 'a'
      engine.sync({
        path: ['screen'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.processKey('a', {});
      // Now replace
      engine.globalSequence([{ keys: ['x', 'y'], operate: () => {} }]);
      expect(engine.getGlobalPendingSequence()).toBeNull();
    });

    test('Given add mode, Then new entries are appended', () => {
      const engine = createEngine();
      engine.globalSequence([{ keys: ['a', 'b'], operate: () => {} }]);
      engine.globalSequence([{ keys: ['c', 'd'], operate: () => {} }], { mode: 'add' });
      expect(engine.getGlobalSequences()).toHaveLength(2);
    });
  });

  describe('string operate resolution', () => {
    test('Given operate is a string referencing a registered sequence action, Then it resolves', () => {
      const engine = createEngine();
      const action = vi.fn();
      engine.defineSequenceAction([{ sequenceActionId: 'mySeq', action }]);
      engine.globalSequence([{ keys: ['a', 'b'], operate: 'mySeq' }]);
      expect(engine.getGlobalSequences()[0].operate).toBe(action);
    });
  });

  describe('getGlobalPendingSequence', () => {
    test('Given no pending sequence, Then returns null', () => {
      const engine = createEngine();
      expect(engine.getGlobalPendingSequence()).toBeNull();
    });
  });
});
