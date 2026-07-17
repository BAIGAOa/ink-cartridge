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
    const engine = createEngine(undefined, undefined, true);
    setup(engine);
    const h1 = vi.fn();
    const h2 = vi.fn();
    engine.boundKeyboard(['a'], h1, { focusId: 'f1' });
    engine.boundKeyboard(['b'], h2, { focusId: 'f2' });
    // f1 is auto-selected
    expect(engine.focusCurrent().result?.id).toBe('f1');
    engine.processKey('a', {});
    expect(h1).toHaveBeenCalled();
    // b should NOT fire because f2 is not active
    engine.processKey('b', {});
    expect(h2).not.toHaveBeenCalled();
    // Tab to f2
    engine.processKey('tab', {});
    expect(engine.focusCurrent().result?.id).toBe('f2');
    engine.processKey('b', {});
    expect(h2).toHaveBeenCalled();
  });

  test('Given focusUnregister removes active target, remaining target is auto-selected', () => {
    const engine = createEngine();
    setup(engine);
    engine.boundKeyboard(['a'], () => {}, { focusId: 'f1' });
    engine.boundKeyboard(['b'], () => {}, { focusId: 'f2' });
    engine.focusUnregister('f1');
    expect(engine.focusCurrent().result?.id).toBe('f2');
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

  // Multi-focus system: keys are routed only to the active focus target of
  // each group. A binding on a non-active group target must not fire.
  describe('group-scoped focus key routing', () => {
    test('Given two targets in one group, only the active target receives keys', () => {
      const engine = createEngine();
      setup(engine);
      const h1 = vi.fn();
      const h2 = vi.fn();
      engine.boundKeyboard(['a'], h1, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard(['b'], h2, { focusId: { group: 'row', focusId: 'r2' } });
      // r1 auto-selected (first registration, currentFocusIds was empty)
      engine.processKey('a', {});
      expect(h1).toHaveBeenCalledTimes(1);
      engine.processKey('b', {});
      expect(h2).not.toHaveBeenCalled();
      engine.focusSet('r2', 'row');
      engine.processKey('b', {});
      expect(h2).toHaveBeenCalledTimes(1);
      engine.processKey('a', {});
      expect(h1).toHaveBeenCalledTimes(1);
    });

    test('Given two groups active simultaneously, both receive their keys', () => {
      const engine = createEngine();
      setup(engine);
      const rowH = vi.fn();
      const colH = vi.fn();
      engine.boundKeyboard(['r'], rowH, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard(['c'], colH, { focusId: { group: 'col', focusId: 'c1' } });
      // r1 auto-selected; activate c1 explicitly
      engine.focusSet('c1', 'col');
      engine.processKey('r', {});
      engine.processKey('c', {});
      expect(rowH).toHaveBeenCalledTimes(1);
      expect(colH).toHaveBeenCalledTimes(1);
    });

    test('Given a default-group and a named-group target, only the active one in each fires', () => {
      const engine = createEngine();
      setup(engine);
      const defH = vi.fn();
      const grpH = vi.fn();
      engine.boundKeyboard(['d'], defH, { focusId: 'def1' });
      engine.boundKeyboard(['g'], grpH, { focusId: { group: 'row', focusId: 'r1' } });
      // def1 auto-selected; 'row' group inactive until focusSet
      engine.processKey('d', {});
      expect(defH).toHaveBeenCalledTimes(1);
      engine.processKey('g', {});
      expect(grpH).not.toHaveBeenCalled();
      engine.focusSet('r1', 'row');
      engine.processKey('g', {});
      expect(grpH).toHaveBeenCalledTimes(1);
      engine.processKey('d', {});
      expect(defH).toHaveBeenCalledTimes(2);
    });

    test('Given focusNext on a group cycles which target receives keys', () => {
      const engine = createEngine(undefined, undefined, true);
      setup(engine);
      const h1 = vi.fn();
      const h2 = vi.fn();
      engine.boundKeyboard(['a'], h1, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard(['b'], h2, { focusId: { group: 'row', focusId: 'r2' } });
      engine.processKey('a', {});
      expect(h1).toHaveBeenCalledTimes(1);
      // Tab cycles within the default group, but autoTab has no group param;
      // use focusNext('row') directly to cycle the named group.
      engine.focusNext('row');
      engine.processKey('b', {});
      expect(h2).toHaveBeenCalledTimes(1);
      engine.processKey('a', {});
      expect(h1).toHaveBeenCalledTimes(1);
    });

    test('Given focusUnregister removes the active group target, keys route to the auto-selected remainder', () => {
      const engine = createEngine();
      setup(engine);
      const h1 = vi.fn();
      const h2 = vi.fn();
      engine.boundKeyboard(['a'], h1, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard(['b'], h2, { focusId: { group: 'row', focusId: 'r2' } });
      engine.focusUnregister('r1', 'row');
      expect(engine.focusCurrent('row').result?.id).toBe('r2');
      engine.processKey('b', {});
      expect(h2).toHaveBeenCalledTimes(1);
      engine.processKey('a', {});
      expect(h1).not.toHaveBeenCalled();
    });
  });
});
