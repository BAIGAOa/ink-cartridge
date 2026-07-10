import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('BindingService — useModalMissListener', () => {
  test('Given useModalMissListener on a modal layer, Then callback is stored', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    const cb = vi.fn();
    engine.useModalMissListener(cb);
    engine.popOwner('modal1');
    const layer = engine.readLayer('modal1');
    expect(layer!.onMiss).toBeDefined();
  });

  test('Given useModalMissListener on non-modal layer, Then throws', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    expect(() => engine.useModalMissListener(() => {})).toThrow(
      /useModalMissListener/,
    );
  });

  test('Given useModalMissListener returns unbind, calling it removes the callback', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    const undo = engine.useModalMissListener(() => {});
    engine.popOwner('modal1');
    undo();
    expect(engine.readLayer('modal1')!.onMiss).toBeUndefined();
  });

  test('Given useModalMissListener with options, Then onMissOptions are stored', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.useModalMissListener(() => {}, { monitorWhen: true });
    engine.popOwner('modal1');
    expect(engine.readLayer('modal1')!.onMissOptions).toEqual({ monitorWhen: true });
  });
});
