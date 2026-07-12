import { describe, test, expect, vi } from 'vitest';
import CompositionEngine, { CompositioKey, CompositionContext } from '../../../src/CompositionEngine.js';
import EngineState from '../../../src/engine/EngineState.js';
import { createContext } from '../../_helpers/factories.js';

function mkState() {
  return new EngineState({
    normalizeKeyNames: (_input: string, _key: unknown) => [],
  });
}

function mk(overrides: Partial<CompositioKey> = {}): CompositioKey {
  return {
    key: 'x',
    flag: 'action',
    needs: [],
    execute: (ctx) => ({ ...ctx, lastFlag: (overrides.flag ?? 'action'), steps: [...ctx.steps, overrides.key ?? 'x'] }),
    ...overrides,
  };
}

function ctx(eventNames: string[], topComponent: unknown = 'screen', conditions?: Map<string, boolean>) {
  return createContext({ eventNames, topComponent, conditions });
}

describe('CompositionEngine', () => {
  describe('registryCompositionKey', () => {
    test('Given two entries with same key, Then both are registered', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'times' }));
      engine.registryCompositionKey(mk({ key: 'a', flag: 'action' }));

      // Both entries should resolve — the engine picks the right one via needs
      engine.synchronizingKey(['a']);
      const consumed = engine.start(createContext({ eventNames: ['a'], topComponent: 'screen' }), false);
      expect(consumed).toBe(true);
    });
  });

  describe('start — head key', () => {
    test('Given optional key with no needs, Then start() consumes event and sets pending', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', optional: true, needs: [] }));
      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given non-optional key with needs and no lastFlag, Then start() returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'w', flag: 'action', optional: false, needs: ['times'] }));
      expect(engine.start(ctx(['w']), false)).toBe(false);
    });

    test('Given key not registered, Then start() returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.start(ctx(['z']), false)).toBe(false);
    });
  });

  describe('start — chain continuation', () => {
    test('Given pending chain, pressing matching needs key continues chain', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', optional: true, needs: [] }));
      engine.registryCompositionKey(mk({ key: 'w', flag: 'action', optional: false, needs: ['times'] }));

      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(engine.start(ctx(['w']), false)).toBe(true);
      // Chain should still be alive after w (pending renewed)
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given pending chain, executor transforms context step by step', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      const timesExec = vi.fn((c: CompositionContext) => ({
        value: 3, lastFlag: 'times', steps: [...c.steps, '3'],
      }));
      const actionExec = vi.fn((c: CompositionContext) => ({
        value: (c.value as number) * 10, lastFlag: 'action', steps: [...c.steps, 's'],
      }));

      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], execute: timesExec }));
      engine.registryCompositionKey(mk({ key: 's', flag: 'action', needs: ['times'], execute: actionExec }));

      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(timesExec).toHaveBeenCalledTimes(1);
      expect(engine.start(ctx(['s']), false)).toBe(true);
      expect(actionExec).toHaveBeenCalledTimes(1);
      // s executor received context with value: 3 from previous step
      expect(actionExec).toHaveBeenCalledWith(
        expect.objectContaining({ value: 3, lastFlag: 'times', steps: ['3'] }),
      );
    });
  });

  describe('start — exclusive mismatch', () => {
    test('Given exclusive pending and mismatched key, Then key is consumed silently', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'w', flag: 'action', optional: true, exclusive: true, needs: ['times'] }));

      engine.start(ctx(['w']), false);
      expect(state.compositionEngineHandle).toBe(true);

      // Press a key that does NOT match 'times' in needs
      const consumed = engine.start(ctx(['x']), false);
      expect(consumed).toBe(true);
      // Pending is still alive
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given non-exclusive pending and mismatched key, Then pending is cleared and key falls through', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'w', flag: 'action', optional: true, exclusive: false, needs: ['times'] }));

      engine.start(ctx(['w']), false);
      expect(state.compositionEngineHandle).toBe(true);

      const consumed = engine.start(ctx(['x']), false);
      expect(consumed).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });
  });

  describe('start — execute returns null', () => {
    test('Given head key execute returns null, Then chain does not start', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flag: 'times', needs: [],
        execute: () => null,
      }));
      expect(engine.start(ctx(['3']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given chain key execute returns null and KeyReleaseWhenChainInterrupted not set, Then key falls through and chain ends', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        execute: () => null,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['w']), false)).toBe(false); // falls through, chain ended
      expect(state.compositionEngineHandle).toBe(false); // cleared
    });

    test('Given chain key execute returns null and KeyReleaseWhenChainInterrupted is true, Then key is swallowed and chain ends', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        execute: () => null,
        KeyReleaseWhenChainInterrupted: true,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['w']), false)).toBe(true); // consumed silently, chain ended
      expect(state.compositionEngineHandle).toBe(false); // cleared
    });

    test('Given chain key execute returns null and KeyReleaseWhenChainInterrupted is false, Then key falls through and chain ends', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        execute: () => null,
        KeyReleaseWhenChainInterrupted: false,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['w']), false)).toBe(false); // falls through, chain ended
      expect(state.compositionEngineHandle).toBe(false); // cleared
    });

    test('Given head key execute returns null and KeyReleaseWhenChainInterrupted is true, Then chain does not start', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flag: 'times', needs: [],
        execute: () => null,
        KeyReleaseWhenChainInterrupted: true,
      }));

      expect(engine.start(ctx(['3']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });
  });

  describe('affectOverlay filtering', () => {
    test('Given entry with affectOverlay:true and active overlay, Then overlay-phase matches but screen-phase does not', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'action', affectOverlay: true, needs: [], optional: true }));

      const ovCtx = createContext({
        eventNames: ['a'],
        topComponent: 'screen',
        activeOverlays: [{ id: 'ov1' }],
        activeCount: 1,
      });
      const scCtx = createContext({ eventNames: ['a'], topComponent: 'screen' });

      expect(engine.start(ovCtx, true)).toBe(true);
      expect(engine.start(scCtx, false)).toBe(false);
    });

    test('Given no overlays active and affectOverlay entry without executeWhenNoOverlay, Then overlay phase skips', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'b', flag: 'action', affectOverlay: true, needs: [], optional: true }));

      // ctx defaults to activeCount=0, no overlays
      expect(engine.start(ctx(['b']), true)).toBe(false);
    });

    test('Given overlays active, Then affectOverlay:true entry matches in overlay phase', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'c', flag: 'action', affectOverlay: true, needs: [], optional: true }));

      const overlayCtx = createContext({
        eventNames: ['c'],
        topComponent: 'screen',
        activeOverlays: [{ id: 'ov1' }],
        activeCount: 1,
      });
      expect(engine.start(overlayCtx, true)).toBe(true);
    });

    test('Given executeWhenNoOverlay:true with no active overlays, Then overlay phase still matches', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'e', flag: 'action', needs: [], optional: true,
        affectOverlay: true, executeWhenNoOverlay: true,
      }));

      // No overlays active, but executeWhenNoOverlay keeps the entry alive
      expect(engine.start(ctx(['e']), true)).toBe(true);
    });
  });

  describe('category filtering', () => {
    test('Given category matches topComponent, Then matches', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'd', flag: 'action', needs: [], optional: true, category: ['editor'] }));

      expect(engine.start(ctx(['d'], 'editor'), false)).toBe(true);
    });

    test('Given category does not include topComponent, Then skips', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'd', flag: 'action', needs: [], optional: true, category: ['editor'] }));

      expect(engine.start(ctx(['d'], 'viewer'), false)).toBe(false);
    });

    test('Given category="*", Then matches any topComponent', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'f', flag: 'action', needs: [], optional: true, category: '*' }));

      expect(engine.start(ctx(['f'], 'anything'), false)).toBe(true);
    });
  });

  describe('removeCompositionKey', () => {
    test('Given a registered key, Then removes it and returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'action' }));
      expect(engine.removeCompositionKey('a')).toBe(true);
      expect(engine.start(ctx(['a']), false)).toBe(false);
    });

    test('Given a non-existent key, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.removeCompositionKey('z')).toBe(false);
    });
  });

  describe('clearAllCompositionKeys', () => {
    test('Given multiple registered keys, Then all are removed', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'action' }));
      engine.registryCompositionKey(mk({ key: 'b', flag: 'times' }));
      engine.clearAllCompositionKeys();
      expect(engine.start(ctx(['a']), false)).toBe(false);
      expect(engine.start(ctx(['b']), false)).toBe(false);
    });
  });

  describe('hasPending', () => {
    test('Given no chain started, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.hasPending()).toBe(false);
    });

    test('Given chain started, Then returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.start(ctx(['3']), false);
      expect(engine.hasPending()).toBe(true);
    });
  });

  describe('getContext', () => {
    test('Given fresh engine, Then returns empty context', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      const c = engine.getContext();
      expect(c.value).toBeUndefined();
      expect(c.lastFlag).toBeNull();
      expect(c.steps).toEqual([]);
    });

    test('Given chain in progress, Then returns current context', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flag: 'times', needs: [], optional: true,
      }));
      engine.start(ctx(['3']), false);
      const c = engine.getContext();
      expect(c.lastFlag).toBe('times');
      expect(c.steps).toEqual(['3']);
    });

    test('Given getContext returns a copy, Then mutating it does not affect engine', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flag: 'times', needs: [], optional: true,
      }));
      engine.start(ctx(['3']), false);
      const c = engine.getContext();
      c.steps.push('extra');
      expect(engine.getContext().steps).toEqual(['3']);
    });
  });

  describe('abort', () => {
    test('Given active pending chain, Then abort cancels it', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'w', flag: 'action', needs: ['times'], optional: true }));
      engine.start(ctx(['w']), false);
      expect(engine.hasPending()).toBe(true);
      engine.abort();
      expect(engine.hasPending()).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given no pending, Then abort is a no-op', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.abort();
      expect(engine.hasPending()).toBe(false);
    });
  });

  describe('when — function condition', () => {
    test('Given when returns false for a head key, Then start() returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        when: () => false,
      }));
      expect(engine.start(ctx(['x']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given when returns true for a head key, Then start() returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        when: () => true,
      }));
      expect(engine.start(ctx(['x']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given chain started and next key when returns false, Then chain is cleared and key falls through', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        when: () => false,
      }));

      engine.start(ctx(['3']), false);
      expect(state.compositionEngineHandle).toBe(true);

      const consumed = engine.start(ctx(['w']), false);
      expect(consumed).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given chain started and next key when returns true, Then chain continues', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        when: () => true,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['w']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given when function reads external state that changes mid-sequence, Then chain respects current state', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      let enabled = true;

      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        when: () => enabled,
      }));

      // Start chain while condition is true
      engine.start(ctx(['3']), false);
      expect(state.compositionEngineHandle).toBe(true);

      // Disable condition mid-sequence
      enabled = false;

      const consumed = engine.start(ctx(['w']), false);
      expect(consumed).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });
  });

  describe('when — named condition', () => {
    test('Given when references a registered condition with value true, Then head key starts', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        when: 'editing',
      }));
      expect(engine.start(ctx(['x'], 'screen', new Map([['editing', true]])), false)).toBe(true);
    });

    test('Given when references a registered condition with value false, Then head key is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        when: 'editing',
      }));
      expect(engine.start(ctx(['x'], 'screen', new Map([['editing', false]])), false)).toBe(false);
    });

    test('Given chain started and next key when condition flips to false, Then chain is cleared', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      const conditions = new Map([['editing', true]]);

      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        when: 'editing',
      }));

      engine.start(ctx(['3']), false);
      expect(state.compositionEngineHandle).toBe(true);

      // Flip condition to false
      conditions.set('editing', false);

      const consumed = engine.start(ctx(['w'], 'screen', conditions), false);
      expect(consumed).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });
  });

  describe('mode filtering', () => {
    test('Given entry with matching mode, Then head key starts', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        mode: 'insert',
      }));
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(true);
    });

    test('Given entry with non-matching mode, Then head key is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', flag: 'action', needs: [], optional: true,
        mode: 'normal',
      }));
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(false);
    });

    test('Given entry without mode, Then works in any mode', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'x', flag: 'action', needs: [], optional: true }));
      // currentMode is 'insert' but entry has no mode → should still match
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(true);
    });

    test('Given entry without mode, Then works when currentMode is null', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'x', flag: 'action', needs: [], optional: true }));
      expect(engine.start(ctx(['x']), false)).toBe(true);
    });

    test('Given chain key with non-matching mode, Then filtered out and chain falls through', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', flag: 'action', needs: ['times'],
        mode: 'normal',
      }));

      engine.start(ctx(['3']), false);
      const c = createContext({ eventNames: ['w'], topComponent: 'screen', currentMode: 'insert' });
      const consumed = engine.start(c, false);
      expect(consumed).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });
  });

  describe('updateCompositionKey', () => {
    test('Given existing key+flag, Then updates the entry and returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'times', needs: [], optional: true }));
      expect(engine.updateCompositionKey('a', 'times', { needs: ['action'], optional: false })).toBe(true);
      // Now needs=['action'], optional=false → head key won't match
      engine.synchronizingKey(['a']);
      expect(engine.start(ctx(['a']), false)).toBe(false);
    });

    test('Given non-existent key, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.updateCompositionKey('z', 'action', { needs: [] })).toBe(false);
    });

    test('Given existing key but wrong flag, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', flag: 'times' }));
      expect(engine.updateCompositionKey('a', 'other', { needs: [] })).toBe(false);
    });
  });
});
