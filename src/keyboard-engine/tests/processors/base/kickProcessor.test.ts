import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('kickProcessor', () => {
  test('returns true when kicking an active processor', () => {
    const engine = createEngine();
    expect(engine.kickProcessor('modal')).toBe(true);
  });

  test('returns false when processor is already kicked', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    expect(engine.kickProcessor('modal')).toBe(false);
  });

  test('stays in disabled list when kicked (idempotency)', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    expect(engine.kickProcessor('modal')).toBe(false);
    expect(engine.kickProcessor('modal')).toBe(false);
  });

  test('kicked processor still appears in getProcessors', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    const all = engine.getProcessors();
    expect(all.some((p) => p.id === 'modal')).toBe(true);
  });

  test('kicking screen-stack prevents per-screen key bindings from firing', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const handler = vi.fn();
    engine.boundKeyboard(['x'], handler);
    engine.kickProcessor('screen-stack');
    engine.processKey('x', {});
    expect(handler).not.toHaveBeenCalled();
  });

  test('kicking modal lets keys pass through the modal barrier to global keys', () => {
    const engine = createEngine();
    const globalOp = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp, affectOverlay: false }]);
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    engine.kickProcessor('modal');
    engine.processKey('x', {});
    expect(globalOp).toHaveBeenCalled();
  });

  test('kicking global-key-screen prevents screen-phase global keys from firing', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const globalOp = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp }]);
    engine.kickProcessor('global-key-screen');
    engine.processKey('x', {});
    expect(globalOp).not.toHaveBeenCalled();
  });

  test('kicking global-key-overlay prevents overlay-phase global keys from firing', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: ['ov1'],
      displayedOverlays: [{ id: 'ov1' }],
      activeModalId: null,
      displayedModals: [],
    });
    const globalOp = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp, affectOverlay: true }]);
    engine.kickProcessor('global-key-overlay');
    engine.processKey('x', {});
    expect(globalOp).not.toHaveBeenCalled();
  });

  test('kicking overlay prevents overlay-layer bindings from firing', () => {
    const engine = createEngine();
    const handler = vi.fn();
    engine.pushOwner('overlay1');
    engine.boundKeyboard(['x'], handler);
    engine.popOwner('overlay1');
    engine.sync({
      path: ['screen'],
      activeOverlayIds: ['overlay1'],
      displayedOverlays: [{ id: 'overlay1' }],
      activeModalId: null,
      displayedModals: [],
    });
    engine.kickProcessor('overlay');
    engine.processKey('x', {});
    expect(handler).not.toHaveBeenCalled();
  });

  test('kicking global-sequence-screen prevents screen-phase global sequences', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const handler = vi.fn();
    engine.globalSequence([{ keys: ['g', 'g'], operate: handler }]);
    engine.kickProcessor('global-sequence-screen');
    engine.processKey('g', {});
    expect(engine.getGlobalPendingSequence()).toBeNull();
  });

  test('composition processors can be kicked and re-activated', () => {
    const engine = createEngine();
    expect(engine.kickProcessor('composition-overlay')).toBe(true);
    expect(engine.kickProcessor('composition-overlay')).toBe(false);
    expect(engine.activeProcessor('composition-overlay')).toBe(true);

    expect(engine.kickProcessor('composition-screen')).toBe(true);
    expect(engine.kickProcessor('composition-screen')).toBe(false);
    expect(engine.activeProcessor('composition-screen')).toBe(true);
  });
});

describe('activeProcessor', () => {
  test('returns false when processor was not kicked', () => {
    const engine = createEngine();
    expect(engine.activeProcessor('modal')).toBe(false);
  });

  test('returns true when re-activating a kicked processor', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    expect(engine.activeProcessor('modal')).toBe(true);
  });

  test('returns false when re-activating an already active processor', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    engine.activeProcessor('modal');
    expect(engine.activeProcessor('modal')).toBe(false);
  });

  test('re-activated processor restores normal behavior', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const handler = vi.fn();
    engine.boundKeyboard(['x'], handler);

    // Kick — handler does NOT fire
    engine.kickProcessor('screen-stack');
    engine.processKey('x', {});
    expect(handler).not.toHaveBeenCalled();

    // Re-activate — handler fires again
    engine.activeProcessor('screen-stack');
    engine.processKey('x', {});
    expect(handler).toHaveBeenCalledOnce();
  });

  test('re-activating restores global key processing', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const globalOp = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp }]);

    engine.kickProcessor('global-key-screen');
    engine.processKey('x', {});
    expect(globalOp).not.toHaveBeenCalled();

    engine.activeProcessor('global-key-screen');
    engine.processKey('x', {});
    expect(globalOp).toHaveBeenCalledOnce();
  });
});

describe('multiple processors kick/activate', () => {
  test('multiple processors kicked independently', () => {
    const engine = createEngine();
    expect(engine.kickProcessor('modal')).toBe(true);
    expect(engine.kickProcessor('overlay')).toBe(true);
    expect(engine.kickProcessor('screen-stack')).toBe(true);

    expect(engine.kickProcessor('modal')).toBe(false);
    expect(engine.kickProcessor('overlay')).toBe(false);
  });

  test('multiple processors re-activated independently', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    engine.kickProcessor('overlay');

    expect(engine.activeProcessor('modal')).toBe(true);
    expect(engine.activeProcessor('overlay')).toBe(true);

    expect(engine.activeProcessor('modal')).toBe(false);
    expect(engine.activeProcessor('overlay')).toBe(false);
  });

  test('kicking multiple processors disables all targeted stages', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
    const globalOp = vi.fn();
    const screenHandler = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp }]);
    engine.boundKeyboard(['x'], screenHandler);

    engine.kickProcessor('global-key-screen');
    engine.kickProcessor('screen-stack');

    engine.processKey('x', {});
    expect(globalOp).not.toHaveBeenCalled();
    expect(screenHandler).not.toHaveBeenCalled();
  });

  test('mix of kick and activate across multiple processors', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    engine.kickProcessor('overlay');
    engine.kickProcessor('screen-stack');

    // Activate only modal
    expect(engine.activeProcessor('modal')).toBe(true);
    expect(engine.kickProcessor('modal')).toBe(true); // still kickable again

    // overlay and screen-stack remain kicked
    expect(engine.kickProcessor('overlay')).toBe(false);
    expect(engine.kickProcessor('screen-stack')).toBe(false);

    // Both are still removable from disabled list
    expect(engine.activeProcessor('overlay')).toBe(true);
    expect(engine.activeProcessor('screen-stack')).toBe(true);
  });
});

describe('kick/activate all built-in processor IDs', () => {
  const allIds = [
    'modal',
    'composition-overlay',
    'global-sequence-overlay',
    'global-key-overlay',
    'overlay',
    'composition-screen',
    'global-sequence-screen',
    'global-key-screen',
    'screen-stack',
  ] as const;

  test('every built-in processor can be kicked and re-activated', () => {
    for (const id of allIds) {
      const engine = createEngine();
      expect(engine.kickProcessor(id)).toBe(true);
      expect(engine.kickProcessor(id)).toBe(false);
      expect(engine.activeProcessor(id)).toBe(true);
      expect(engine.activeProcessor(id)).toBe(false);
    }
  });
});

describe('kick/activate no effect on pipeline structure', () => {
  test('kicked processors do not change getProcessors count', () => {
    const engine = createEngine();
    const beforeCount = engine.getProcessors().length;
    engine.kickProcessor('modal');
    engine.kickProcessor('overlay');
    expect(engine.getProcessors().length).toBe(beforeCount);
  });

  test('addProcessor still works after kick', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    engine.kickProcessor('overlay');
    engine.addProcessor({
      id: 'custom',
      process: () => false,
    });
    expect(engine.getProcessors().some((p) => p.id === 'custom')).toBe(true);
  });

  test('removeProcessor still removes a kicked processor', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    expect(engine.getProcessors().some((p) => p.id === 'modal')).toBe(true);
    const result = engine.removeProcessor('modal');
    expect(result).toBe(true);
    expect(engine.getProcessors().some((p) => p.id === 'modal')).toBe(false);
  });

  test('resetProcessors does not clear kicked state (noActiveProcessor persists)', () => {
    const engine = createEngine();
    engine.kickProcessor('modal');
    engine.kickProcessor('screen-stack');

    engine.resetProcessors();

    // Kick state persists across resets — processors remain disabled
    expect(engine.kickProcessor('modal')).toBe(false);
    expect(engine.kickProcessor('screen-stack')).toBe(false);

    // Must explicitly re-activate
    expect(engine.activeProcessor('modal')).toBe(true);
    expect(engine.activeProcessor('screen-stack')).toBe(true);
  });
});
