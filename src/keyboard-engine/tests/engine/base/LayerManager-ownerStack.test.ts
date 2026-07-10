import { describe, test, expect } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('LayerManager — owner stack', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  describe('pushOwner / popOwner', () => {
    test('Given pushOwner with matching overlay id, boundKeyboard binds to the overlay layer', () => {
      const engine = createEngine();
      // Include ov1 as an active overlay so getLayer assigns kind="overlay"
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
      // The layer kind is 'overlay' because 'ov1' is in displayedOverlays
      expect(layer!.kind).toBe('overlay');
    });

    test('Given popOwner with lastIndexOf, nested same-type owners are unwound correctly', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1', 'ov2'],
        displayedOverlays: [{ id: 'ov1' }, { id: 'ov2' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.pushOwner('ov1');
      engine.pushOwner('ov2');
      engine.pushOwner('ov1'); // same id, nested deeper
      // Current owner is 'ov1' (the inner one)
      engine.boundKeyboard('x', () => {});
      // popOwner uses lastIndexOf — removes the innermost 'ov1'
      engine.popOwner('ov1');
      // Now current owner is 'ov2'
      engine.boundKeyboard('y', () => {});
      engine.popOwner('ov2');
      engine.popOwner('ov1');

      // Outer ov1 should only have 'x' (from inner bind); 'y' went to ov2
      const ov1Layer = engine.readLayer('ov1')!;
      const ov2Layer = engine.readLayer('ov2')!;
      expect(ov1Layer.bindings).toHaveLength(1);
      expect(ov2Layer.bindings).toHaveLength(1);
    });
  });

  describe('getCurrentOwner', () => {
    test('Given owner stack has entries, Then getCurrentOwner returns the top of stack', () => {
      const engine = createEngine();
      setup(engine);
      engine.pushOwner('screenA'); // even though same as path top, it's pushed
      engine.boundKeyboard('x', () => {});
      engine.popOwner('screenA');
      expect(engine.readLayer('screenA')).toBeDefined();
    });

    test('Given empty owner stack, Then getCurrentOwner returns top of screen path', () => {
      const engine = createEngine();
      setup(engine);
      engine.boundKeyboard('x', () => {});
      expect(engine.readLayer('screenA')).toBeDefined();
    });

    test('Given empty path and empty stack, Then boundKeyboard throws', () => {
      const engine = createEngine();
      expect(() => engine.boundKeyboard('x', () => {})).toThrow(
        /boundKeyboard.*must be called inside/,
      );
    });
  });
});
