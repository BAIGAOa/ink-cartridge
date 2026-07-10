import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';

describe('focus management integration', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given two focus targets, Tab cycles between them', () => {
    const engine = createEngine();
    setup(engine);
    const h1 = vi.fn();
    const h2 = vi.fn();
    engine.boundKeyboard(['a'], h1, { focusId: 'f1' });
    engine.boundKeyboard(['b'], h2, { focusId: 'f2' });
    // f1 is auto-selected
    expect(engine.focusCurrent()).toBe('f1');
    engine.processKey('a', {});
    expect(h1).toHaveBeenCalled();
    // b should NOT fire because f2 is not active
    engine.processKey('b', {});
    expect(h2).not.toHaveBeenCalled();
    // Tab to f2
    engine.processKey('tab', {});
    expect(engine.focusCurrent()).toBe('f2');
    engine.processKey('b', {});
    expect(h2).toHaveBeenCalled();
  });

  test('Given focusUnregister removes active target, remaining target is auto-selected', () => {
    const engine = createEngine();
    setup(engine);
    engine.boundKeyboard(['a'], () => {}, { focusId: 'f1' });
    engine.boundKeyboard(['b'], () => {}, { focusId: 'f2' });
    engine.focusUnregister('f1');
    expect(engine.focusCurrent()).toBe('f2');
  });

  test('Given prevMode cycles backward through registered modes', () => {
    const engine = createEngine(['normal', 'insert', 'visual']);
    setup(engine);
    engine.setMode('normal');
    engine.prevMode();
    expect(engine.getCurrentMode()).toBe('visual');
    engine.prevMode();
    expect(engine.getCurrentMode()).toBe('insert');
  });

  test('Given setMode with null exits all modes', () => {
    const engine = createEngine(['normal'], 'normal');
    setup(engine);
    engine.setMode(null);
    expect(engine.getCurrentMode()).toBeNull();
  });
});
