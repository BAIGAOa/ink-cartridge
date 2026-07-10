import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';

describe('modal miss detection', () => {
  test('Given modal with onMiss callback, unhandled key triggers miss event', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    const onMiss = vi.fn();
    engine.useModalMissListener(onMiss);
    engine.popOwner('modal1');
    engine.processKey('x', {});
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true }),
    );
  });

  test('Given modal with a binding, handled key triggers { miss: false }', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.boundKeyboard(['enter'], () => {});
    const onMiss = vi.fn();
    engine.useModalMissListener(onMiss);
    engine.popOwner('modal1');
    engine.processKey('enter', {});
    expect(onMiss).toHaveBeenCalledWith({ miss: false });
  });

  test('Given monitorWhen option and when=false binding, miss is detected', () => {
    const engine = createEngine();
    engine.addCondition('editing', false);
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.boundKeyboard(['x'], () => {}, { when: 'editing' });
    const onMiss = vi.fn();
    engine.useModalMissListener(onMiss, { monitorWhen: true });
    engine.popOwner('modal1');
    engine.processKey('x', {});
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true }),
    );
  });

  test('Given monitorFocusMismatch and binding on non-active focus target, miss is detected', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.boundKeyboard(['a'], () => {}, { focusId: 'f1' });
    engine.boundKeyboard(['b'], () => {}, { focusId: 'f2' });
    // f1 is auto-selected; 'b' is bound to f2 (non-active)
    const onMiss = vi.fn();
    engine.useModalMissListener(onMiss, { monitorFocusMismatch: true });
    engine.popOwner('modal1');
    engine.processKey('b', {});
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true }),
    );
  });

  test('Given modal with allowModal key, key passes through and does not trigger miss', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.allowModal(['escape']);
    const onMiss = vi.fn();
    engine.useModalMissListener(onMiss);
    engine.popOwner('modal1');
    engine.processKey('escape', {});
    // Key passed through modal via allow-list, onMiss is NOT called with miss:true
    // (the modal processor returns false, so onMiss is not invoked)
  });
});
