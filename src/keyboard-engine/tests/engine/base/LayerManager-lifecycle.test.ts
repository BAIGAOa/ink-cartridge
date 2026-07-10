import { describe, test, expect } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('LayerManager — lifecycle', () => {
  describe('readLayer', () => {
    test('Given no layer exists for the owner, Then returns undefined', () => {
      const engine = createEngine();
      expect(engine.readLayer('nonexistent')).toBeUndefined();
    });

    test('Given boundKeyboard creates a layer, Then readLayer returns it with correct kind', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.boundKeyboard('x', () => {});
      const layer = engine.readLayer('screenA');
      expect(layer).toBeDefined();
      expect(layer!.kind).toBe('screen');
      expect(layer!.bindings).toHaveLength(1);
    });

    test('Given an overlay creates a layer, Then its kind is "overlay"', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.pushOwner('ov1');
      engine.boundKeyboard('x', () => {});
      engine.popOwner('ov1');
      const layer = engine.readLayer('ov1');
      expect(layer).toBeDefined();
      expect(layer!.kind).toBe('overlay');
    });
  });

  describe('cleanLayers', () => {
    test('Given screen removed from path, cleanLayers removes its layer', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.boundKeyboard('x', () => {});
      expect(engine.readLayer('screenA')).toBeDefined();
      // First cleanLayers stores prevPathRef
      engine.cleanLayers();

      // Change path to screenB
      engine.sync({
        path: ['screenB'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.cleanLayers();
      expect(engine.readLayer('screenA')).toBeUndefined();
    });
  });

  describe('cleanOverlayLayers', () => {
    test('Given overlay removed, cleanOverlayLayers removes its layer', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.pushOwner('ov1');
      engine.boundKeyboard('x', () => {});
      engine.popOwner('ov1');
      // First cleanOverlayLayers stores prev state
      engine.cleanOverlayLayers();

      // Remove overlay
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.cleanOverlayLayers();
      expect(engine.readLayer('ov1')).toBeUndefined();
    });
  });

  describe('cleanModalLayers', () => {
    test('Given modal removed, cleanModalLayers removes its layer', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: 'modal1',
        displayedModals: [{ id: 'modal1' }],
      });
      engine.pushOwner('modal1');
      engine.boundKeyboard('x', () => {});
      engine.popOwner('modal1');
      // First cleanModalLayers stores prev state
      engine.cleanModalLayers();

      // Remove modal
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.cleanModalLayers();
      expect(engine.readLayer('modal1')).toBeUndefined();
    });
  });

  describe('pendingSequence timer cleanup', () => {
    test('Given layer with pendingSequence, cleanLayers clears the timer and removes the layer', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.boundKeyboard(['a'], () => {});
      // Create a fake pendingSequence with a timer
      const layer = engine.readLayer('screenA')!;
      layer.pendingSequence = {
        sequences: ['a', 'b'],
        nextIndex: 1,
        handler: () => {},
        timer: setTimeout(() => {}, 99999),
        timeout: 500,
      };
      // First cleanLayers stores prev
      engine.cleanLayers();
      // Change path
      engine.sync({
        path: ['screenB'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.cleanLayers();
      expect(engine.readLayer('screenA')).toBeUndefined();
    });
  });

  describe('layer reuse', () => {
    test('Given a layer already exists, getLayer returns the existing one', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      engine.boundKeyboard('a', () => {});
      const layer1 = engine.readLayer('screenA');
      engine.boundKeyboard('b', () => {});
      const layer2 = engine.readLayer('screenA');
      expect(layer1).toBe(layer2);
      expect(layer2!.bindings).toHaveLength(2);
    });
  });
});
