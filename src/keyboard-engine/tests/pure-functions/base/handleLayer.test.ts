import { describe, test, expect, vi } from 'vitest';
import { handleLayer } from '../../../src/layerHandler.js';
import {
  fakeLayer,
  makeEntry,
  makeSequenceBinding,
  makePendingSequence,
  fakeFocusTarget,
} from '../../_helpers/factories.js';

function noop() {}
const dummyKey = {};

describe('handleLayer', () => {
  describe('Tab navigation (highest priority)', () => {
    test('Given isTop=true, eventNames includes tab, and focusOrder has items, Then Tab navigates and consumes event', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b'],
        currentFocusId: null,
      });
      const result = handleLayer(
        layer, ['tab'], '', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(layer.currentFocusId).toBe('a');
    });

    test('Given isTop=false, Tab navigation is not processed even with tab key', () => {
      const layer = fakeLayer({
        focusOrder: ['a'],
        currentFocusId: null,
      });
      const result = handleLayer(
        layer, ['tab'], '', dummyKey, false, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
    });

    test('Given Tab navigation returns false (empty focusOrder), event continues', () => {
      const layer = fakeLayer({ focusOrder: [] });
      const result = handleLayer(
        layer, ['tab'], '', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
    });
  });

  describe('penetration filtering', () => {
    test('Given layer has penetration rule matching current key, the key is removed from available', () => {
      const layer = fakeLayer({
        penetrationKeys: [{ key: 'x' }],
      });
      const handler = vi.fn();
      layer.bindings = [makeEntry(['x'], handler)];
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('Given penetration rule has when=false, the key is not filtered', () => {
      const layer = fakeLayer({
        penetrationKeys: [{ key: 'x', when: () => false }],
      });
      const handler = vi.fn();
      layer.bindings = [makeEntry(['x'], handler)];
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('onlyThis semantics', () => {
    test('Given screen layer with onlyThis=true and activeOverlay present, Then skips', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], handler, { onlyThis: true })],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 1, false, false, null, new Map(),
      );
      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('Given screen layer with onlyThis=true and no activeOverlay, Then fires normally', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], handler, { onlyThis: true })],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    test('Given overlay layer with onlyThis=true and activeOverlayCount > 1, Then skips', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        kind: 'overlay',
        bindings: [makeEntry(['x'], handler, { onlyThis: true })],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 2, true, false, null, new Map(),
      );
      expect(result).toBe(false);
    });

    test('Given overlay layer with onlyThis=true and activeOverlayCount=1, Then fires normally', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        kind: 'overlay',
        bindings: [makeEntry(['x'], handler, { onlyThis: true })],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 1, true, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('wildcardFirst pre-check', () => {
    test('Given wildcardFirst=true with * binding matching a normal char, Then * fires first', () => {
      const wildcardHandler = vi.fn();
      const exactHandler = vi.fn();
      const layer = fakeLayer({
        bindings: [
          makeEntry(['*'], wildcardHandler),
          makeEntry(['x'], exactHandler),
        ],
      });
      const result = handleLayer(
        layer, ['x'], 'x', {}, true, noop, 0, false, true, null, new Map(),
      );
      expect(result).toBe(true);
      expect(wildcardHandler).toHaveBeenCalledOnce();
      expect(exactHandler).not.toHaveBeenCalled();
    });

    test('Given wildcardFirst=true but * binding mode does not match, Then * is skipped', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['*'], handler, { mode: 'insert' })],
      });
      const result = handleLayer(
        layer, ['a'], 'a', {}, true, noop, 0, false, true, 'normal', new Map(),
      );
      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('Given wildcardFirst=true with focus target * binding, Then focus target * fires first', () => {
      const ftHandler = vi.fn();
      const screenHandler = vi.fn();
      const ft = fakeFocusTarget({
        bindings: [makeEntry(['*'], ftHandler)],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
        bindings: [makeEntry(['*'], screenHandler)],
      });
      handleLayer(
        layer, ['a'], 'a', {}, true, noop, 0, false, true, null, new Map(),
      );
      expect(ftHandler).toHaveBeenCalledOnce();
      expect(screenHandler).not.toHaveBeenCalled();
    });
  });

  describe('Sequence matching — existing pending', () => {
    test('Given pending when becomes false, Then cancels pending and falls through', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], handler)],
        pendingSequence: makePendingSequence(['a', 'b'], vi.fn(), {
          when: () => false,
          nextIndex: 1,
        }),
      });
      handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence).toBeNull();
      expect(handler).toHaveBeenCalledOnce();
    });

    test('Given pending next key matches and is the last key, Then fires handler and clears pending', () => {
      const seqHandler = vi.fn();
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b'], seqHandler, {
          nextIndex: 1,
        }),
      });
      const result = handleLayer(
        layer, ['b'], 'b', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(seqHandler).toHaveBeenCalledWith('b', dummyKey);
      expect(layer.pendingSequence).toBeNull();
    });

    test('Given pending next key matches but is not last, Then advances nextIndex and restarts timer', () => {
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b', 'c'], vi.fn(), {
          nextIndex: 1,
          timeout: 500,
        }),
      });
      const result = handleLayer(
        layer, ['b'], 'b', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(layer.pendingSequence!.nextIndex).toBe(2);
      expect(layer.pendingSequence!.timer).toBeDefined();
    });

    test('Given pending with multiple candidates and current key matches, Then narrows candidates', () => {
      const handler = vi.fn();
      const c1 = makeSequenceBinding(['a', 'b', 'c'], handler);
      const c2 = makeSequenceBinding(['a', 'b', 'd'], handler);
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b', 'c'], handler, {
          nextIndex: 1,
          candidates: [c1, c2],
        }),
      });
      handleLayer(
        layer, ['b'], 'b', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence!.nextIndex).toBe(2);
    });

    test('Given pending mismatch with exclusive=true, Then consumes key silently and returns true', () => {
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b'], vi.fn(), {
          nextIndex: 1,
          options: { exclusive: true },
        }),
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
    });

    test('Given pending mismatch non-exclusive with no candidates, Then cancels pending and falls through', () => {
      const bindingHandler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], bindingHandler)],
        pendingSequence: makePendingSequence(['a', 'b'], vi.fn(), {
          nextIndex: 1,
        }),
      });
      handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence).toBeNull();
      expect(bindingHandler).toHaveBeenCalledOnce();
    });

    test('Given pending mismatch non-exclusive with multiple candidates, current key matches one candidate, Then switches to that candidate', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const c1 = makeSequenceBinding(['a', 'b', 'c'], h1);
      const c2 = makeSequenceBinding(['a', 'x', 'y'], h2);
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b', 'c'], h1, {
          nextIndex: 1,
          candidates: [c1, c2],
        }),
      });
      handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence!.sequences).toEqual(['a', 'x', 'y']);
      expect(layer.pendingSequence!.nextIndex).toBe(2);
    });

    test('Given pending mismatch non-exclusive with multiple candidates, none match, Then cancels all', () => {
      const c1 = makeSequenceBinding(['a', 'b', 'c'], vi.fn());
      const c2 = makeSequenceBinding(['a', 'd', 'e'], vi.fn());
      const layer = fakeLayer({
        pendingSequence: makePendingSequence(['a', 'b', 'c'], vi.fn(), {
          nextIndex: 1,
          candidates: [c1, c2],
        }),
      });
      handleLayer(
        layer, ['z'], 'z', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence).toBeNull();
    });
  });

  describe('Sequence matching — starting new sequence', () => {
    test('Given a matching sequence registered, pressing first key creates pending', () => {
      const seqHandler = vi.fn();
      const layer = fakeLayer();
      layer.sequences.set('g', [makeSequenceBinding(['g', 'g'], seqHandler)]);
      const result = handleLayer(
        layer, ['g'], 'g', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(layer.pendingSequence).not.toBeNull();
      expect(layer.pendingSequence!.sequences).toEqual(['g', 'g']);
      expect(layer.pendingSequence!.nextIndex).toBe(1);
    });

    test('Given ctrl/meta modifier held, bare key name does not start a sequence', () => {
      const seqHandler = vi.fn();
      const layer = fakeLayer();
      layer.sequences.set('d', [makeSequenceBinding(['d', 'v'], seqHandler)]);
      const result = handleLayer(
        layer, ['d', 'ctrl+d'], 'd', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
      expect(layer.pendingSequence).toBeNull();
    });

    test('Given sequence mode does not match currentMode, Then does not start', () => {
      const layer = fakeLayer();
      layer.sequences.set('g', [
        makeSequenceBinding(['g', 'g'], vi.fn(), { options: { mode: 'insert' } }),
      ]);
      handleLayer(
        layer, ['g'], 'g', dummyKey, true, noop, 0, false, false, 'normal', new Map(),
      );
      expect(layer.pendingSequence).toBeNull();
    });

    test('Given multiple non-exclusive candidates sharing first key, Then candidates are stored', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const layer = fakeLayer();
      layer.sequences.set('g', [
        makeSequenceBinding(['g', 'g'], h1),
        makeSequenceBinding(['g', 't'], h2),
      ]);
      handleLayer(
        layer, ['g'], 'g', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence!.candidates).toHaveLength(2);
    });

    test('Given only one candidate or exclusive mode, Then candidates is undefined', () => {
      const layer = fakeLayer();
      layer.sequences.set('g', [
        makeSequenceBinding(['g', 'g'], vi.fn(), { options: { exclusive: true } }),
      ]);
      handleLayer(
        layer, ['g'], 'g', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence!.candidates).toBeUndefined();
    });

    test('Given sequence when is false, Then does not start', () => {
      const layer = fakeLayer();
      layer.sequences.set('g', [
        makeSequenceBinding(['g', 'g'], vi.fn(), { when: () => false }),
      ]);
      handleLayer(
        layer, ['g'], 'g', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(layer.pendingSequence).toBeNull();
    });
  });

  describe('Focus target bindings', () => {
    test('Given isTop with active focus target, Then checks focus target bindings first', () => {
      const ftHandler = vi.fn();
      const screenHandler = vi.fn();
      const ft = fakeFocusTarget({
        bindings: [makeEntry(['x'], ftHandler)],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
        bindings: [makeEntry(['x'], screenHandler)],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(ftHandler).toHaveBeenCalledOnce();
      expect(screenHandler).not.toHaveBeenCalled();
    });

    test('Given focus target has no matching binding, Then falls through to layer-level', () => {
      const screenHandler = vi.fn();
      const ft = fakeFocusTarget({
        bindings: [makeEntry(['y'], vi.fn())],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
        bindings: [makeEntry(['x'], screenHandler)],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(screenHandler).toHaveBeenCalledOnce();
    });

    test('Given focus target stopped key matches, Then consumes event and returns true', () => {
      const ft = fakeFocusTarget({
        stoppedKeys: [{ key: 'x' }],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
    });
  });

  describe('Layer-level bindings', () => {
    test('Given layer binding matches, Then fires handler and returns true', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], handler)],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('x', dummyKey);
    });
  });

  describe('stopped key penetration edge case', () => {
    test('Given stopped key with when=false, Then key penetrates through (not blocked)', () => {
      const handler = vi.fn();
      const layer = fakeLayer({
        bindings: [makeEntry(['x'], handler)],
        stoppedKeys: [{ key: 'x', when: () => false }],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      // stopped key when=false → key is NOT stopped, falls through to bindings
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Layer-level stopped keys', () => {
    test('Given isTop and stopped key matches, Then returns true (blocks propagation)', () => {
      const layer = fakeLayer({
        stoppedKeys: [{ key: 'x' }],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(true);
    });

    test('Given isTop=false, stopped key does not block even if it matches', () => {
      const layer = fakeLayer({
        stoppedKeys: [{ key: 'x' }],
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, false, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
    });
  });

  describe('focus target penetration', () => {
    test('Given focus target has penetration but not layer-level, Then only focus target binding is transparent', () => {
      const ftHandler = vi.fn();
      const screenHandler = vi.fn();
      const ft = fakeFocusTarget({
        bindings: [makeEntry(['y'], ftHandler)],
        penetrationKeys: [{ key: 'y' }],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
        bindings: [makeEntry(['y'], screenHandler)],
      });
      const result = handleLayer(
        layer, ['y'], 'y', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      // Focus target 'y' binding is penetrated, so falls through to screen level
      expect(ftHandler).not.toHaveBeenCalled();
      expect(screenHandler).toHaveBeenCalledOnce();
    });

    test('Given focus target stopped key with when=false, Then key is not stopped', () => {
      const ft = fakeFocusTarget({
        stoppedKeys: [{ key: 'x', when: () => false }],
      });
      const layer = fakeLayer({
        focusTargets: new Map([['f1', ft]]),
        focusOrder: ['f1'],
        currentFocusId: 'f1',
      });
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
    });
  });

  describe('fall through', () => {
    test('Given no match at all (binding/sequence/focus/stop), Then returns false', () => {
      const layer = fakeLayer();
      const result = handleLayer(
        layer, ['x'], 'x', dummyKey, true, noop, 0, false, false, null, new Map(),
      );
      expect(result).toBe(false);
    });
  });
});
