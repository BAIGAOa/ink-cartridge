import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';
import type { CompositioKey, CompositionContext } from '../../src/CompositionEngine.js';

function setup(engine: ReturnType<typeof createEngine>) {
  engine.sync({
    path: ['screen'],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  });
}

describe('composition pipeline integration', () => {
  describe('context passing', () => {
    test('Given 3→s→w chain, Then context accumulates through each executor', () => {
      const engine = createEngine();
      setup(engine);

      const values: number[] = [];

      engine.composition.registryCompositionKey({
        key: '3',
        flag: 'times',
        needs: [],
        execute: (ctx) => ({
          value: 3,
          lastFlag: 'times',
          steps: [...ctx.steps, '3'],
        }),
      });

      engine.composition.registryCompositionKey({
        key: 's',
        flag: 'action',
        needs: ['times'],
        execute: (ctx) => {
          const v = (ctx.value as number) * 10;
          return { value: v, lastFlag: 'action', steps: [...ctx.steps, 's'] };
        },
      });

      engine.composition.registryCompositionKey({
        key: 'w',
        flag: 'action',
        needs: ['action'],
        optional: true,
        execute: (ctx) => {
          values.push(ctx.value as number);
          return { value: ctx.value, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
        },
      });

      engine.processKey('3', {});
      engine.processKey('s', {});
      engine.processKey('w', {});

      // s multiplied 3 → 30, w received value=30
      expect(values).toEqual([30]);
    });

    test('Given w alone as head key, Then executor receives undefined value', () => {
      const engine = createEngine();
      setup(engine);

      const received: unknown[] = [];

      engine.composition.registryCompositionKey({
        key: 'w',
        flag: 'action',
        needs: ['times'],
        optional: true,
        execute: (ctx) => {
          received.push(ctx.value);
          const times = ctx.value ?? 1;
          return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
        },
      });

      engine.processKey('w', {});
      expect(received).toEqual([undefined]);
    });
  });

  describe('composition vs global sequence', () => {
    test('Given composition registered key, Then it takes priority over global sequence', () => {
      const engine = createEngine();
      setup(engine);

      const compExec = vi.fn((ctx: CompositionContext) => ({
        value: 1, lastFlag: 'action', steps: [...ctx.steps, 'x'],
      }));
      const globalSeqHandler = vi.fn();

      engine.composition.registryCompositionKey({
        key: 'x',
        flag: 'action',
        needs: [],
        execute: compExec,
      });

      engine.globalSequence([{ keys: ['x', 'y'], operate: globalSeqHandler }]);

      engine.processKey('x', {});
      expect(compExec).toHaveBeenCalled();
      expect(globalSeqHandler).not.toHaveBeenCalled();
    });

    test('Given composition does not know first key, Then global sequence starts and composition does not steal second key', () => {
      const engine = createEngine();
      setup(engine);

      const compExec = vi.fn((ctx: CompositionContext) => ({
        value: 1, lastFlag: 'action', steps: [...ctx.steps, 'y'],
      }));
      const globalSeqHandler = vi.fn();

      engine.composition.registryCompositionKey({
        key: 'y',
        flag: 'action',
        needs: [],
        execute: compExec,
      });

      engine.globalSequence([{ keys: ['c', 'y'], operate: globalSeqHandler }]);

      // First key — composition doesn't know 'c', falls through to global seq
      engine.processKey('c', {});
      expect(compExec).not.toHaveBeenCalled();

      // Second key — global seq sees 'y', composition should NOT steal it
      // because pendingSeqRef was set by global seq and compositionEngineHandler is false
      engine.processKey('y', {});
      expect(globalSeqHandler).toHaveBeenCalled();
      expect(compExec).not.toHaveBeenCalled();
    });
  });

  describe('composition with overlay phase', () => {
    test('Given overlay composition key with active overlay, Then it fires in overlay phase', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screen'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });

      const exec = vi.fn((ctx: CompositionContext) => ({
        value: 1, lastFlag: 'action', steps: [...ctx.steps, 'a'],
      }));

      engine.composition.registryCompositionKey({
        key: 'a',
        flag: 'action',
        needs: [],
        affectOverlay: true,
        execute: exec,
      });

      engine.processKey('a', {});
      expect(exec).toHaveBeenCalled();
    });

    test('Given overlay composition key without active overlay, Then it does not fire', () => {
      const engine = createEngine();
      setup(engine);

      const exec = vi.fn((ctx: CompositionContext) => ({
        value: 1, lastFlag: 'action', steps: [...ctx.steps, 'b'],
      }));

      engine.composition.registryCompositionKey({
        key: 'b',
        flag: 'action',
        needs: [],
        affectOverlay: true,
        execute: exec,
      });

      const consumed = engine.processKey('b', {});
      expect(consumed).toBe(false);
      expect(exec).not.toHaveBeenCalled();
    });
  });

  describe('composition with screen bindings', () => {
    test('Given screen also has binding for same key, Then composition wins (higher priority)', () => {
      const engine = createEngine();
      setup(engine);

      const compExec = vi.fn((ctx: CompositionContext) => ({
        value: 1, lastFlag: 'action', steps: [...ctx.steps, 'z'],
      }));
      const screenHandler = vi.fn();

      engine.composition.registryCompositionKey({
        key: 'z',
        flag: 'action',
        needs: [],
        execute: compExec,
      });
      engine.boundKeyboard(['z'], screenHandler);

      engine.processKey('z', {});
      expect(compExec).toHaveBeenCalled();
      expect(screenHandler).not.toHaveBeenCalled();
    });
  });

  describe('timeout behaviour', () => {
    test('Given head key starts pending and timeout expires, Then next key starts fresh chain', async () => {
      vi.useFakeTimers();
      const engine = createEngine();
      setup(engine);

      const exec3 = vi.fn((ctx: CompositionContext) => ({
        value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'],
      }));
      const execW = vi.fn((ctx: CompositionContext) => ({
        value: ctx.value ?? 1, lastFlag: 'action', steps: [...ctx.steps, 'w'],
      }));

      engine.composition.registryCompositionKey({
        key: '3', flag: 'times', needs: [], execute: exec3,
      });
      engine.composition.registryCompositionKey({
        key: 'w', flag: 'action', needs: ['times'], optional: true, execute: execW,
      });

      // Start chain
      engine.processKey('3', {});
      expect(exec3).toHaveBeenCalledTimes(1);

      // Timeout expires
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      // Next press — fresh chain, w as head
      engine.processKey('w', {});
      expect(execW).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
