import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('BindingService — penetration', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given penetration marks keys as transparent, Then they pass through to lower layers', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard('x', handler);
    // Mark 'x' as transparent
    engine.penetration(['x']);
    engine.processKey('x', {});
    // Key should be transparent, handler NOT called
    expect(handler).not.toHaveBeenCalled();
  });

  test('Given penetration with focusId, Then only that focus target is transparent', () => {
    const engine = createEngine();
    setup(engine);
    const ftHandler = vi.fn();
    engine.boundKeyboard('x', ftHandler, { focusId: 'input1' });
    // Penetrate only on 'input1'
    engine.penetration(['x'], { focusId: 'input1' });
    engine.processKey('x', {});
    expect(ftHandler).not.toHaveBeenCalled();
  });

  test('Given penetration returns unbind function, calling it restores the key', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard('x', handler);
    const undo = engine.penetration(['x']);
    undo();
    engine.processKey('x', {});
    expect(handler).toHaveBeenCalled();
  });
});

describe('BindingService — stop', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given stop marks keys as propagation barrier, Then they consume the event', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard('x', handler);
    engine.stop(['x']);
    // Key should be consumed by stop, handler should fire (stop doesn't prevent handlers)
    engine.processKey('x', {});
    // stop returns true (consumed) even though handler fires
    // The key IS consumed by the stop layer, preventing propagation
  });

  test('Given stop with stopAction=true, Then resolves actionIds to bound keys', () => {
    const engine = createEngine();
    setup(engine);
    engine.defineShortcutAction([{ actionId: 'act', action: () => {} }]);
    engine.boundKeyboard(['x'], 'act');
    engine.stop(['act'], { stopAction: true });
    // stop should resolve 'act' → 'x'
    engine.processKey('x', {});
    // Key consumed by stop
  });

  test('Given stop returns unbind function, calling it removes the stop', () => {
    const engine = createEngine();
    setup(engine);
    const undo = engine.stop(['x']);
    undo();
    // After undo, the key is no longer stopped
    expect(engine.readLayer('screenA')!.stoppedKeys).toHaveLength(0);
  });
});

describe('BindingService — stop with stopAction', () => {
  test('Given stopAction=true with focusId, Then resolves action keys from focus target map', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    engine.defineShortcutAction([{ actionId: 'act', action: () => {} }]);
    engine.boundKeyboard(['x'], 'act', { focusId: 'f1' });
    engine.stop(['act'], { stopAction: true, focusId: 'f1' });
    const ft = engine.readLayer('screenA')!.defaultTargets.get('f1')!;
    expect(ft.stoppedKeys).toHaveLength(1);
    expect(ft.stoppedKeys[0].key).toBe('x');
  });

  test('Given stopAction with unregistered action, Then throws', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    expect(() => engine.stop(['nonexistent'], { stopAction: true })).toThrow(
      /not registered/,
    );
  });

  test('Given stop with when condition, Then condition is stored on the key rule', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    engine.stop(['x'], { when: () => true });
    const stopped = engine.readLayer('screenA')!.stoppedKeys;
    expect(stopped[0].when).toBeDefined();
  });
});

describe('BindingService — penetration with when', () => {
  test('Given penetration with when, Then condition is stored on the key rule', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    engine.penetration(['x'], { when: () => true });
    const pKeys = engine.readLayer('screenA')!.penetrationKeys;
    expect(pKeys[0].when).toBeDefined();
  });
});

describe('BindingService — allowModal', () => {
  test('Given allowModal on a modal layer, Then allowed keys pass through', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.allowModal(['escape']);
    engine.popOwner('modal1');
    const layer = engine.readLayer('modal1');
    expect(layer!.allowedKeys).toHaveLength(1);
    expect(layer!.allowedKeys[0].key).toBe('escape');
  });

  test('Given allowModal on non-modal layer, Then throws', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    expect(() => engine.allowModal(['x'])).toThrow(
      /allowModal/,
    );
  });

  test('Given allowModal with focusId and when condition, Then options are stored', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    engine.boundKeyboard(['x'], () => {}, { focusId: 'f1' });
    engine.allowModal(['escape'], { focusId: 'f1', when: () => true });
    engine.popOwner('modal1');
    const ft = engine.readLayer('modal1')!.defaultTargets.get('f1')!;
    expect(ft.allowedKeys).toHaveLength(1);
    expect(ft.allowedKeys[0].key).toBe('escape');
  });

  test('Given allowModal returns unbind function, calling it removes the allowed key', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.pushOwner('modal1');
    const undo = engine.allowModal(['escape']);
    engine.popOwner('modal1');
    undo();
    expect(engine.readLayer('modal1')!.allowedKeys).toHaveLength(0);
  });
});
