import { describe, test, expect, vi } from 'vitest';
import { createModalProcessor } from '../../../src/processors/modal.js';
import { createContext, fakeLayer, makeEntry } from '../../_helpers/factories.js';
import { defaultTargetsSymbol } from '../../../src/types.js';

describe('createModalProcessor', () => {
  const processor = createModalProcessor();

  test('Given no active modal, Then returns false', () => {
    const ctx = createContext();
    expect(processor.process(ctx)).toBe(false);
  });

  test('Given active modal with no layer, Then still returns true (blocks all)', () => {
    const ctx = createContext({ activeModalId: 'modal1' });
    expect(processor.process(ctx)).toBe(true);
  });

  test('Given modal layer with matching binding, Then event is handled and blocked', () => {
    const handler = vi.fn();
    const layer = fakeLayer({
      kind: 'modal',
      bindings: [makeEntry(['x'], handler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      activeModalId: 'modal1',
      layersRef: { current: new Map([['modal1', layer]]) },
    });
    const result = processor.process(ctx);
    expect(result).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  test('Given modal layer with no matching binding, Then key is blocked and onMiss called', () => {
    const onMiss = vi.fn();
    const layer = fakeLayer({
      kind: 'modal',
      onMiss,
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      key: {},
      activeModalId: 'modal1',
      layersRef: { current: new Map([['modal1', layer]]) },
    });
    const result = processor.process(ctx);
    expect(result).toBe(true);
    expect(onMiss).toHaveBeenCalledWith(
      expect.objectContaining({ miss: true }),
    );
  });

  test('Given allowed key matching layer-level allowedKeys, Then passes through (returns false)', () => {
    const layer = fakeLayer({
      kind: 'modal',
      allowedKeys: [{ key: 'escape' }],
    });
    const ctx = createContext({
      eventNames: ['escape'],
      input: '',
      activeModalId: 'modal1',
      layersRef: { current: new Map([['modal1', layer]]) },
    });
    const result = processor.process(ctx);
    expect(result).toBe(false); // passed through
  });

    test('Given allowed key matching focus target allowedKeys, Then passes through', () => {
    const layer = fakeLayer({
      kind: 'modal',
      currentFocusIds: [{ id: 'ft1', fromGroup: defaultTargetsSymbol }],
      defaultFocusOrder: ['ft1'],
      defaultTargets: new Map([
        ['ft1', {
          bindings: [],
          penetrationKeys: [],
          stoppedKeys: [],
          allowedKeys: [{ key: 'escape' }],
          actionKeysMap: new Map(),
        }],
      ]),
    });
    const ctx = createContext({
      eventNames: ['escape'],
      input: '',
      activeModalId: 'modal1',
      layersRef: { current: new Map([['modal1', layer]]) },
    });
    expect(processor.process(ctx)).toBe(false);
  });

  describe('miss detection', () => {
    test('Given handled=true, onMiss receives { miss: false }', () => {
      const onMiss = vi.fn();
      const layer = fakeLayer({
        kind: 'modal',
        bindings: [makeEntry(['x'], vi.fn())],
        onMiss,
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith({ miss: false });
    });

    test('Given monitorWhen and a when=false binding, Then miss detected', () => {
      const onMiss = vi.fn();
      const layer = fakeLayer({
        kind: 'modal',
        bindings: [makeEntry(['x'], vi.fn(), { when: () => false })],
        onMiss,
        onMissOptions: { monitorWhen: true },
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith(
        expect.objectContaining({ miss: true }),
      );
    });

    test('Given monitorWhen with focus target when=false binding, Then miss detected', () => {
      const onMiss = vi.fn();
      const ft = {
        bindings: [makeEntry(['x'], vi.fn(), { when: () => false })],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const layer = fakeLayer({
        kind: 'modal',
        currentFocusIds: [{ id: 'f1', fromGroup: defaultTargetsSymbol }],
        defaultFocusOrder: ['f1'],
        defaultTargets: new Map([['f1', ft]]),
        onMiss,
        onMissOptions: { monitorWhen: true },
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith(
        expect.objectContaining({ miss: true }),
      );
    });

    test('Given monitorFocusMismatch with binding on non-active focus target, Then miss detected', () => {
      const onMiss = vi.fn();
      const activeFt = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const otherFt = {
        bindings: [makeEntry(['x'], vi.fn())],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const layer = fakeLayer({
        kind: 'modal',
        currentFocusIds: [{ id: 'f1', fromGroup: defaultTargetsSymbol }],
        defaultFocusOrder: ['f1', 'f2'],
        defaultTargets: new Map([['f1', activeFt], ['f2', otherFt]]),
        onMiss,
        onMissOptions: { monitorFocusMismatch: true },
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith(
        expect.objectContaining({ miss: true }),
      );
    });

    test('Given monitorFocusMismatch with binding on non-active group-scoped target, Then miss detected', () => {
      const onMiss = vi.fn();
      const activeGrpFt = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const otherGrpFt = {
        bindings: [makeEntry(['x'], vi.fn())],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const layer = fakeLayer({
        kind: 'modal',
        currentFocusIds: [{ id: 'r1', fromGroup: 'row' }],
        focusTargets: new Map([
          ['row', {
            map: new Map([['r1', activeGrpFt], ['r2', otherGrpFt]]),
            order: ['r1', 'r2'],
          }],
        ]),
        onMiss,
        onMissOptions: { monitorFocusMismatch: true },
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith(
        expect.objectContaining({ miss: true }),
      );
    });

    test('Given monitorWhen with when=false binding on active group-scoped target, Then miss detected', () => {
      const onMiss = vi.fn();
      const grpFt = {
        bindings: [makeEntry(['x'], vi.fn(), { when: () => false })],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      const layer = fakeLayer({
        kind: 'modal',
        currentFocusIds: [{ id: 'r1', fromGroup: 'row' }],
        focusTargets: new Map([
          ['row', { map: new Map([['r1', grpFt]]), order: ['r1'] }],
        ]),
        onMiss,
        onMissOptions: { monitorWhen: true },
      });
      const ctx = createContext({
        eventNames: ['x'],
        input: 'x',
        key: {},
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      processor.process(ctx);
      expect(onMiss).toHaveBeenCalledWith(
        expect.objectContaining({ miss: true }),
      );
    });
  });

  describe('group-scoped focus allowedKeys', () => {
    test('Given allowed key matching group-scoped focus target allowedKeys, Then passes through', () => {
      const grpFt = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [{ key: 'escape' }],
        actionKeysMap: new Map(),
      };
      const layer = fakeLayer({
        kind: 'modal',
        currentFocusIds: [{ id: 'r1', fromGroup: 'row' }],
        focusTargets: new Map([
          ['row', { map: new Map([['r1', grpFt]]), order: ['r1'] }],
        ]),
      });
      const ctx = createContext({
        eventNames: ['escape'],
        input: '',
        activeModalId: 'modal1',
        layersRef: { current: new Map([['modal1', layer]]) },
      });
      expect(processor.process(ctx)).toBe(false);
    });
  });
});
