import { describe, test, expect, vi } from 'vitest';
import CompositionEngine, { CompositioKey, CompositionContext, ValueSchema } from '../../../src/CompositionEngine.js';
import EngineState from '../../../src/engine/EngineState.js';
import { createContext } from '../../_helpers/factories.js';

function mkState() {
  return new EngineState({
    normalizeKeyNames: (_input: string, _key: unknown) => [],
    isNormalChar: () => false,
  });
}

function mk(overrides: Partial<CompositioKey<unknown>> = {}): CompositioKey<unknown> {
  return {
    key: 'x',
    flags: [],
    alternativeFlag: 'action',
    needs: [],
    execute: (ctx: CompositionContext) => ({ ...ctx, lastFlag: (overrides.alternativeFlag ?? 'action'), steps: [...ctx.steps, overrides.key ?? 'x'] }),
    ...overrides,
  };
}

function ctx(eventNames: string[], topComponent: unknown = 'screen', conditions?: Map<string, boolean>) {
  return createContext({ eventNames, topComponent, conditions });
}

const numSchema: ValueSchema = {
  times: (v): v is number => typeof v === 'number',
  action: (v): v is number => typeof v === 'number',
};

function mkWithSchema(schema?: ValueSchema) {
  const state = mkState();
  const engine = new CompositionEngine(state, undefined, schema);
  return { state, engine };
}

describe('CompositionEngine', () => {
  describe('registryCompositionKey', () => {
    test('Given two entries with same key, Then both are registered', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'times' }));
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'action' }));

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
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', optional: true, needs: [] }));
      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given non-optional key with needs and no lastFlag, Then start() returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'w', alternativeFlag: 'action', optional: false, needs: ['times'] }));
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
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', optional: true, needs: [] }));
      engine.registryCompositionKey(mk({ key: 'w', alternativeFlag: 'action', optional: false, needs: ['times'] }));

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

      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], execute: timesExec }));
      engine.registryCompositionKey(mk({ key: 's', alternativeFlag: 'action', needs: ['times'], execute: actionExec }));

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
      engine.registryCompositionKey(mk({ key: 'w', alternativeFlag: 'action', optional: true, exclusive: true, needs: ['times'] }));

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
      engine.registryCompositionKey(mk({ key: 'w', alternativeFlag: 'action', optional: true, exclusive: false, needs: ['times'] }));

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
        key: '3', alternativeFlag: 'times', needs: [],
        execute: () => null,
      }));
      expect(engine.start(ctx(['3']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given chain key execute returns null and KeyReleaseWhenChainInterrupted not set, Then key falls through and chain ends', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
        execute: () => null,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['w']), false)).toBe(false); // falls through, chain ended
      expect(state.compositionEngineHandle).toBe(false); // cleared
    });

    test('Given chain key execute returns null and KeyReleaseWhenChainInterrupted is true, Then key is swallowed and chain ends', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
        key: '3', alternativeFlag: 'times', needs: [],
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
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'action', affectOverlay: true, needs: [], optional: true }));

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
      engine.registryCompositionKey(mk({ key: 'b', alternativeFlag: 'action', affectOverlay: true, needs: [], optional: true }));

      // ctx defaults to activeCount=0, no overlays
      expect(engine.start(ctx(['b']), true)).toBe(false);
    });

    test('Given overlays active, Then affectOverlay:true entry matches in overlay phase', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'c', alternativeFlag: 'action', affectOverlay: true, needs: [], optional: true }));

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
        key: 'e', alternativeFlag: 'action', needs: [], optional: true,
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
      engine.registryCompositionKey(mk({ key: 'd', alternativeFlag: 'action', needs: [], optional: true, category: ['editor'] }));

      expect(engine.start(ctx(['d'], 'editor'), false)).toBe(true);
    });

    test('Given category does not include topComponent, Then skips', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'd', alternativeFlag: 'action', needs: [], optional: true, category: ['editor'] }));

      expect(engine.start(ctx(['d'], 'viewer'), false)).toBe(false);
    });

    test('Given category="*", Then matches any topComponent', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'f', alternativeFlag: 'action', needs: [], optional: true, category: '*' }));

      expect(engine.start(ctx(['f'], 'anything'), false)).toBe(true);
    });

    test('Given empty category array, Then entry is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'g', alternativeFlag: 'action', needs: [], optional: true, category: [] }));

      expect(engine.start(ctx(['g'], 'editor'), false)).toBe(false);
    });

    test('Given null topComponent in context, Then entry is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'h', alternativeFlag: 'action', needs: [], optional: true }));

      expect(engine.start(createContext({ eventNames: ['h'], topComponent: null }), false)).toBe(false);
    });
  });

  describe('removeCompositionKey', () => {
    test('Given a registered key, Then removes it and returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'action' }));
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
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'action' }));
      engine.registryCompositionKey(mk({ key: 'b', alternativeFlag: 'times' }));
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
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
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
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
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
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
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
      engine.registryCompositionKey(mk({ key: 'w', alternativeFlag: 'action', needs: ['times'], optional: true }));
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
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        when: () => false,
      }));
      expect(engine.start(ctx(['x']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given when returns true for a head key, Then start() returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        when: () => true,
      }));
      expect(engine.start(ctx(['x']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given chain started and next key when returns false, Then chain is cleared and key falls through', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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

      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        when: 'editing',
      }));
      expect(engine.start(ctx(['x'], 'screen', new Map([['editing', true]])), false)).toBe(true);
    });

    test('Given when references a registered condition with value false, Then head key is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        when: 'editing',
      }));
      expect(engine.start(ctx(['x'], 'screen', new Map([['editing', false]])), false)).toBe(false);
    });

    test('Given chain started and next key when condition flips to false, Then chain is cleared', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      const conditions = new Map([['editing', true]]);

      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        mode: 'insert',
      }));
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(true);
    });

    test('Given entry with non-matching mode, Then head key is skipped', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'x', alternativeFlag: 'action', needs: [], optional: true,
        mode: 'normal',
      }));
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(false);
    });

    test('Given entry without mode, Then works in any mode', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'x', alternativeFlag: 'action', needs: [], optional: true }));
      // currentMode is 'insert' but entry has no mode → should still match
      const c = createContext({ eventNames: ['x'], topComponent: 'screen', currentMode: 'insert' });
      expect(engine.start(c, false)).toBe(true);
    });

    test('Given entry without mode, Then works when currentMode is null', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'x', alternativeFlag: 'action', needs: [], optional: true }));
      expect(engine.start(ctx(['x']), false)).toBe(true);
    });

    test('Given chain key with non-matching mode, Then filtered out and chain falls through', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'],
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
    test('Given existing key+flags, Then updates the entry and returns true', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'times', needs: [], optional: true }));
      expect(engine.updateCompositionKey('a', [], { needs: ['action'], optional: false })).toBe(true);
      // Now needs=['action'], optional=false → head key won't match
      engine.synchronizingKey(['a']);
      expect(engine.start(ctx(['a']), false)).toBe(false);
    });

    test('Given non-existent key, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.updateCompositionKey('z', [], { needs: [] })).toBe(false);
    });

    test('Given existing key but mismatched flags, Then returns false', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({ key: 'a', alternativeFlag: 'times' }));
      expect(engine.updateCompositionKey('a', [{ need: 'other', become: 'other' }], { needs: [] })).toBe(false);
    });
  });

  describe('flags system', () => {
    test('Given empty flags with alternativeFlag, Then head key auto-propagation uses alternativeFlag', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flags: [], alternativeFlag: 'times', needs: [], optional: true,
        // execute does NOT set lastFlag — engine should auto-fill
        execute: (c) => ({ value: 3, lastFlag: null, steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      const after = engine.getContext();
      expect(after.lastFlag).toBe('times');
    });

    test('Given user sets lastFlag explicitly, Then engine respects it (no auto-propagation)', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flags: [], alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'custom', steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      expect(engine.getContext().lastFlag).toBe('custom');
    });

    test('Given flags array, Then chooseFlag picks the right become from matching need', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flags: [], alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      // "s" declares two potential flags depending on what preceded it
      engine.registryCompositionKey(mk({
        key: 's',
        flags: [
          { need: 'times', become: 'scalar' },
          { need: 'word', become: 'delete' },
        ],
        alternativeFlag: 'unknown',
        needs: ['times', 'word'],
        execute: (c) => ({
          value: (c.value as number) * 10,
          lastFlag: null,  // let engine choose
          steps: [...c.steps, 's'],
        }),
      }));
      // Bind "w" that expects 'scalar' as the precedent
      engine.registryCompositionKey(mk({
        key: 'w', flags: [], alternativeFlag: 'action', needs: ['scalar'], optional: true,
        execute: (c) => ({ value: c.value, lastFlag: null, steps: [...c.steps, 'w'] }),
      }));

      engine.start(ctx(['3']), false);
      // "s" executes, ctx.lastFlag is 'times', chooseFlag matches {need:'times', become:'scalar'}
      engine.start(ctx(['s']), false);
      // "w" can only fire if lastFlag is 'scalar'
      expect(engine.start(ctx(['w']), false)).toBe(true);
    });

    test('Given flags with no matching need, Then falls back to alternativeFlag', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: '3', flags: [], alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's',
        flags: [{ need: 'word', become: 'delete' }],  // 'times' won't match
        alternativeFlag: 'unknown',
        needs: ['times'],  // still needs 'times' to execute
        execute: (c) => ({
          value: (c.value as number) * 10,
          lastFlag: null,
          steps: [...c.steps, 's'],
        }),
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      // no matching need in flags → alternativeFlag 'unknown' used
      expect(engine.getContext().lastFlag).toBe('unknown');
    });

    test('Given chain with auto-propagation, Then subsequent keys resolve by the auto-chosen flag', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      engine.registryCompositionKey(mk({
        key: 'g', flags: [], alternativeFlag: 'gg', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: null, steps: [...c.steps, 'g'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 'g',
        flags: [{ need: 'gg', become: 'end' }],
        alternativeFlag: 'end',
        needs: ['gg'],
        execute: (c) => ({ value: 5, lastFlag: null, steps: [...c.steps, 'g'] }),
      }));
      // Third key expects 'end' as precedent
      engine.registryCompositionKey(mk({
        key: 'enter', flags: [], alternativeFlag: 'done', needs: ['end'], optional: true,
        execute: (c) => ({ value: 10, lastFlag: null, steps: [...c.steps, 'enter'] }),
      }));

      engine.start(ctx(['g']), false);    // → lastFlag auto-fills to 'gg'
      engine.start(ctx(['g']), false);    // → chooseFlag: need='gg' → become='end'
      expect(engine.getContext().lastFlag).toBe('end');
      // 'enter' can execute because lastFlag='end' matches needs=['end']
      expect(engine.start(ctx(['enter']), false)).toBe(true);
    });
  });

  describe('valueSchema', () => {

    test('Given no schema, Then head key output validation passes through', () => {
      const { state, engine } = mkWithSchema();
      engine.registryCompositionKey(mk({ key: '3', alternativeFlag: 'times', needs: [], optional: true }));
      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given head key output matches schema guard, Then chain starts', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      expect(engine.start(ctx(['3']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given head key output fails schema guard, Then chain does not start', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 'bad', lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      expect(engine.start(ctx(['3']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given flag not in schema, Then output validation passes through', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: 'x', alternativeFlag: 'unknown', needs: [], optional: true,
        execute: (c) => ({ value: 'anything', lastFlag: 'unknown', steps: [...c.steps, 'x'] }),
      }));
      expect(engine.start(ctx(['x']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given chain key input matches schema guard, Then chain continues', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: (c.value as number) * 10, lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['s']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(true);
    });

    test('Given chain key input fails schema guard, Then chain is cleared and key falls through', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 'not a number', lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: (c.value as number) * 10, lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      // Input validation fails because lastFlag='times' value='not a number'
      expect(engine.start(ctx(['s']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given chain key output fails schema guard, Then chain is cleared and key falls through', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 'bad output', lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['s']), false)).toBe(false);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given chain key output fails guard and KeyReleaseWhenChainInterrupted is true, Then key is swallowed', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        KeyReleaseWhenChainInterrupted: true,
        execute: (c) => ({ value: 'bad', lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      expect(engine.start(ctx(['s']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given setValueSchema replaces schema, Then new guards take effect', () => {
      const { state, engine } = mkWithSchema();
      engine.setValueSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 'bad', lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      expect(engine.start(ctx(['3']), false)).toBe(false);
    });

    test('Given chain key input fails guard and KeyReleaseWhenChainInterrupted is true, Then key is swallowed', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        KeyReleaseWhenChainInterrupted: true,
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      // Swap schema so input guard for 'times' no longer matches the stored value
      engine.setValueSchema({
        times: (v): v is string => typeof v === 'string',
        action: (v): v is number => typeof v === 'number',
      });
      // Input validation on 's' fails because value=3 doesn't pass new 'times' guard
      // KeyReleaseWhenChainInterrupted swallows it
      expect(engine.start(ctx(['s']), false)).toBe(true);
      expect(state.compositionEngineHandle).toBe(false);
    });

    test('Given head key input with lastFlag null, Then input validation is skipped', () => {
      const { state, engine } = mkWithSchema(numSchema);
      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      // Head key has lastFlag=null internally → validateInput skips
      expect(engine.start(ctx(['3']), false)).toBe(true);
    });

    test('Given exclusive pending and mismatched key, Then timer resets and eventually clears the chain', () => {
      vi.useFakeTimers();
      const { state, engine } = mkWithSchema();
      const clearSpy = vi.spyOn(engine as any, 'clearPending');

      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'], optional: true,
        exclusive: true, timeout: 300,
      }));

      engine.start(ctx(['w']), false);
      // Mismatched key triggers resetPendingTimer via exclusive branch
      engine.start(ctx(['x']), false);
      expect(engine.hasPending()).toBe(true);

      clearSpy.mockClear();
      vi.advanceTimersByTime(300);
      expect(clearSpy).toHaveBeenCalled();
      expect(engine.hasPending()).toBe(false);

      vi.useRealTimers();
      clearSpy.mockRestore();
    });

    test('Given chain continuation, Then timeout eventually clears the pending chain', () => {
      vi.useFakeTimers();
      const { state, engine } = mkWithSchema();
      const clearSpy = vi.spyOn(engine as any, 'clearPending');

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true, timeout: 250,
      }));
      engine.registryCompositionKey(mk({
        key: 'w', alternativeFlag: 'action', needs: ['times'], timeout: 250,
      }));

      engine.start(ctx(['3']), false);
      expect(engine.hasPending()).toBe(true);

      // Advance past the head key's timeout but not all the way
      vi.advanceTimersByTime(200);
      expect(engine.hasPending()).toBe(true);

      clearSpy.mockClear();
      engine.start(ctx(['w']), false);
      // Chain continuation sets a new timer from processPending
      vi.advanceTimersByTime(250);
      expect(clearSpy).toHaveBeenCalled();
      expect(engine.hasPending()).toBe(false);

      vi.useRealTimers();
      clearSpy.mockRestore();
    });

    test('Given pending chain from overlay phase, Then screen phase processPending does not consume', () => {
      const { state, engine } = mkWithSchema();
      const ovCtx = createContext({
        eventNames: ['a'],
        topComponent: 'screen',
        activeOverlays: [{ id: 'ov1' }],
        activeCount: 1,
      });

      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'action', needs: [], optional: true,
        affectOverlay: true,
      }));
      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 'next', needs: ['action'],
        affectOverlay: true,
      }));

      // Start chain in overlay phase
      engine.start(ovCtx, true);
      expect(engine.hasPending()).toBe(true);

      // Try to continue in screen phase — phase mismatch, pending stays alive
      engine.synchronizingKey(['b']);
      expect(engine.start(ctx(['b']), false)).toBe(false);
      expect(engine.hasPending()).toBe(true);
    });
  });

  describe('undo', () => {
    test('Given no completed chain, Then undo() returns null', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      expect(engine.undo()).toBeNull();
    });

    test('Given single-key chain completed via timeout, Then undo() returns the reverted context', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      let undone = false;

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => {
          undone = true;
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));

      engine.start(ctx(['3']), false);
      vi.advanceTimersByTime(500);
      expect(engine.hasPending()).toBe(false);

      const result = engine.undo();
      expect(result).not.toBeNull();
      expect(undone).toBe(true);
      expect(engine.getContext().value).toBeUndefined();
      expect(engine.getContext().lastFlag).toBeNull();

      vi.useRealTimers();
    });

    test('Given second undo call after first, Then returns null (buffers cleared)', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));

      engine.start(ctx(['3']), false);
      vi.advanceTimersByTime(500);

      expect(engine.undo()).not.toBeNull();
      expect(engine.undo()).toBeNull();

      vi.useRealTimers();
    });

    test('Given multi-key chain, Then undoActions are called in reverse order with propagated ctx', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => {
          undoLog.push(`undo-3(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: (c.value as number) * 10, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: (c) => {
          undoLog.push(`undo-s(v=${c.value})`);
          return { value: 3, lastFlag: 'times', steps: ['3'] };
        },
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      expect(engine.undo()).not.toBeNull();
      expect(undoLog).toEqual(['undo-s(v=30)', 'undo-3(v=3)']);

      vi.useRealTimers();
    });

    test('Given two sequences buffered, Then undo(2) reverses both in correct order', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      // Sequence 1: "a" → value=1
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'seq1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'seq1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => {
          undoLog.push(`undo-a(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      // Sequence 2: "b" → value=2
      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 'seq2', needs: [], optional: true,
        execute: (c) => ({ value: 2, lastFlag: 'seq2', steps: [...c.steps, 'b'] }),
        undoAction: (c) => {
          undoLog.push(`undo-b(v=${c.value})`);
          return { value: 1, lastFlag: 'seq1', steps: [] };
        },
      }));
      engine.start(ctx(['b']), false);
      vi.advanceTimersByTime(500);

      // undo(2) — most recent first: b then a
      const result = engine.undo(2);
      expect(result).not.toBeNull();
      expect(undoLog).toEqual(['undo-b(v=2)', 'undo-a(v=1)']);

      // Both sequences consumed
      expect(engine.undo()).toBeNull();

      vi.useRealTimers();
    });

    test('Given steps exceeds buffer count, Then undo() throws', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'seq1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'seq1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      expect(() => engine.undo(2)).toThrow(
        '[keyboard-engine] Cannot undo 2 sequence(s): only 1 buffered.',
      );

      vi.useRealTimers();
    });

    test('Given isolated mode, Then each sequence restarts ctx from its own saved state', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const ctxLog: string[] = [];

      // Sequence 1: g g — second g sets value=5
      engine.registryCompositionKey(mk({
        key: 'g', alternativeFlag: 'gg', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'gg', steps: [...c.steps, 'g'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-g1(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.registryCompositionKey(mk({
        key: 'g', alternativeFlag: 'end', needs: ['gg'],
        execute: (c) => ({ value: 5, lastFlag: 'end', steps: [...c.steps, 'g'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-g2(v=${c.value})`);
          return { value: 1, lastFlag: 'gg', steps: ['g'] };
        },
      }));
      engine.start(ctx(['g']), false);
      engine.start(ctx(['g']), false);
      vi.advanceTimersByTime(500);

      // Sequence 2: d g — second g sets value=9
      engine.registryCompositionKey(mk({
        key: 'd', alternativeFlag: 'dd', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'dd', steps: [...c.steps, 'd'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-d(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.registryCompositionKey(mk({
        key: 'g', alternativeFlag: 'final', needs: ['dd'],
        execute: (c) => ({ value: 9, lastFlag: 'final', steps: [...c.steps, 'g'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-g3(v=${c.value})`);
          return { value: 3, lastFlag: 'dd', steps: ['d'] };
        },
      }));
      engine.start(ctx(['d']), false);
      engine.start(ctx(['g']), false);
      vi.advanceTimersByTime(500);

      // Isolated undo: seq2 first (g3→d), seq1 second (g2→g1)
      // Each sequence restarts ctx from its own saved state
      engine.undo(2, { isolated: true });

      // Seq2: g3 starts from value=9 → d starts from value=3 (NOT from g3's output)
      // Seq1: g2 starts from value=5 → g1 starts from value=1
      // In isolated mode, d gets ctx.value=3 (its own saved ctx), NOT whatever g3 returned
      expect(ctxLog).toEqual([
        'undo-g3(v=9)',
        'undo-d(v=3)',
        'undo-g2(v=5)',
        'undo-g1(v=1)',
      ]);

      vi.useRealTimers();
    });

    test('Given default flat mode, Then ctx propagates across sequences (backward compatible)', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const ctxLog: string[] = [];

      // Sequence 1: "a" → value=1
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'a1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-a(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      // Sequence 2: "b" → value=2
      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 'b1', needs: [], optional: true,
        execute: (c) => ({ value: 2, lastFlag: 'b1', steps: [...c.steps, 'b'] }),
        undoAction: (c) => {
          ctxLog.push(`undo-b(v=${c.value})`);
          return { value: 1, lastFlag: 'a1', steps: [] };
        },
      }));
      engine.start(ctx(['b']), false);
      vi.advanceTimersByTime(500);

      // Flat mode (default): b's undo output (value=1) feeds into a's undo
      engine.undo(2);
      expect(ctxLog).toEqual(['undo-b(v=2)', 'undo-a(v=1)']);

      vi.useRealTimers();
    });

    test('Given undoAction returns null, Then undo chain stops early', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => {
          undoLog.push('undo-3');
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: () => null,
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      engine.undo();
      expect(undoLog).toEqual([]);

      vi.useRealTimers();
    });

    test('Given no undoAction on a key, Then identity pass-through keeps chain going', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: (c) => {
          undoLog.push(`undo-s(v=${c.value})`);
          return { value: undefined, lastFlag: null, steps: [] };
        },
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      engine.undo();
      expect(undoLog).toEqual(['undo-s(v=30)']);

      vi.useRealTimers();
    });

    test('Given abort() before timeout, Then the aborted chain can still be undone', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));

      engine.start(ctx(['3']), false);
      engine.abort();
      // abort() now records history before clearing
      expect(engine.undo()).not.toBeNull();
      expect(engine.getContext().value).toBeUndefined();
    });

    test('Given valueSchema validates undo input and output, Then undo succeeds', () => {
      vi.useFakeTimers();
      const { state, engine } = mkWithSchema(numSchema);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: (c) => ({ value: 3, lastFlag: 'times', steps: ['3'] }),
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      expect(engine.undo()).not.toBeNull();
      expect(engine.getContext().value).toBeUndefined();
      expect(engine.getContext().lastFlag).toBeNull();

      vi.useRealTimers();
    });

    test('Given undo input fails schema guard, Then undo stops with context mid-chain', () => {
      vi.useFakeTimers();
      const { state, engine } = mkWithSchema(numSchema);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: (c) => ({ value: 3, lastFlag: 'times', steps: ['3'] }),
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      engine.setValueSchema({
        times: (v): v is number => typeof v === 'number',
        action: (v): v is string => typeof v === 'string',
      });

      engine.undo();
      expect(engine.getContext().lastFlag).toBe('action');
      expect(engine.getContext().value).toBe(30);

      vi.useRealTimers();
    });

    test('Given undo output fails schema guard, Then undo stops mid-chain', () => {
      vi.useFakeTimers();
      const { state, engine } = mkWithSchema(numSchema);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
        undoAction: (c) => ({ value: 'bad', lastFlag: 'times', steps: ['3'] }),
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      engine.undo();
      expect(engine.getContext().lastFlag).toBe('action');

      vi.useRealTimers();
    });

    test('Given undo without valueSchema, Then no validation runs', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 'anything', lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));

      engine.start(ctx(['3']), false);
      vi.advanceTimersByTime(500);

      expect(engine.undo()).not.toBeNull();
      expect(engine.getContext().value).toBeUndefined();

      vi.useRealTimers();
    });

    test('Given byKey mode, Then undo(2) undoes 2 individual keys across sequences', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      // Seq1: a → a  (2 keys)
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'a1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => { undoLog.push('undo-a1'); return { value: undefined, lastFlag: null, steps: [] }; },
      }));
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a2', needs: ['a1'],
        execute: (c) => ({ value: 2, lastFlag: 'a2', steps: [...c.steps, 'a'] }),
        undoAction: (c) => { undoLog.push('undo-a2'); return { value: 1, lastFlag: 'a1', steps: ['a'] }; },
      }));
      engine.start(ctx(['a']), false);
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      // Seq2: b  (1 key)
      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 'b1', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'b1', steps: [...c.steps, 'b'] }),
        undoAction: (c) => { undoLog.push('undo-b'); return { value: undefined, lastFlag: null, steps: [] }; },
      }));
      engine.start(ctx(['b']), false);
      vi.advanceTimersByTime(500);

      // undo(2, { byKey: true }) — 2 most recent keys: b then a2
      engine.undo(2, { byKey: true });
      expect(undoLog).toEqual(['undo-b', 'undo-a2']);
      // a1 still in buffer (not consumed)
      expect(engine.bufferedCount()).toBe(1);

      vi.useRealTimers();
    });

    test('Given byKey exceeds total keys, Then throws with key count', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'a1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      expect(() => engine.undo(5, { byKey: true })).toThrow(
        '[keyboard-engine] Cannot undo 5 key(s): only 1 buffered.',
      );

      vi.useRealTimers();
    });

    test('Given byKey with isolated, Then ctx restarts per sequence, key-granular', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const undoLog: string[] = [];

      // Seq1: a → a  (2 keys)
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 'a1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => { undoLog.push(`undo-a1(v=${c.value})`); return { value: undefined, lastFlag: null, steps: [] }; },
      }));
      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 'a2', needs: ['a1'],
        execute: (c) => ({ value: 22, lastFlag: 'a2', steps: [...c.steps, 'a'] }),
        undoAction: (c) => { undoLog.push(`undo-a2(v=${c.value})`); return { value: 1, lastFlag: 'a1', steps: ['a'] }; },
      }));
      engine.start(ctx(['a']), false);
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);

      // Seq2: b  (1 key)
      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 'b1', needs: [], optional: true,
        execute: (c) => ({ value: 99, lastFlag: 'b1', steps: [...c.steps, 'b'] }),
        undoAction: (c) => { undoLog.push(`undo-b(v=${c.value})`); return { value: undefined, lastFlag: null, steps: [] }; },
      }));
      engine.start(ctx(['b']), false);
      vi.advanceTimersByTime(500);

      // undo(3, { byKey: true, isolated: true }) — 3 keys: b (seq2 solo), a2 → a1 (seq1)
      engine.undo(3, { byKey: true, isolated: true });

      // In isolated mode, a2 restarts from its own ctx (value=22), NOT b's output
      // a1 receives a2's output (within same sequence)
      expect(undoLog).toEqual(['undo-b(v=99)', 'undo-a2(v=22)', 'undo-a1(v=1)']);
      expect(engine.bufferedCount()).toBe(0);

      vi.useRealTimers();
    });

    test('Given bufferedCount, Then returns correct number of undoable sequences', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      expect(engine.bufferedCount()).toBe(0);

      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 's1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 's1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);
      expect(engine.bufferedCount()).toBe(1);

      engine.registryCompositionKey(mk({
        key: 'b', alternativeFlag: 's2', needs: [], optional: true,
        execute: (c) => ({ value: 2, lastFlag: 's2', steps: [...c.steps, 'b'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.start(ctx(['b']), false);
      vi.advanceTimersByTime(500);
      expect(engine.bufferedCount()).toBe(2);

      vi.useRealTimers();
    });

    test('Given clearBuffers, Then all undo history is removed', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: 'a', alternativeFlag: 's1', needs: [], optional: true,
        execute: (c) => ({ value: 1, lastFlag: 's1', steps: [...c.steps, 'a'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));
      engine.start(ctx(['a']), false);
      vi.advanceTimersByTime(500);
      expect(engine.bufferedCount()).toBe(1);

      engine.clearBuffers();
      expect(engine.bufferedCount()).toBe(0);
      expect(engine.undo()).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('subscription', () => {
    test('Given subscriber, Then fires on chain started, continued, completed', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const events: string[] = [];

      engine.subscribe(() => {
        events.push(engine.getLastEvent()?.type ?? '');
      });

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));
      engine.registryCompositionKey(mk({
        key: 's', alternativeFlag: 'action', needs: ['times'],
        execute: (c) => ({ value: 30, lastFlag: 'action', steps: [...c.steps, 's'] }),
      }));

      engine.start(ctx(['3']), false);
      engine.start(ctx(['s']), false);
      vi.advanceTimersByTime(500);

      expect(events).toEqual(['started', 'continued', 'completed']);

      vi.useRealTimers();
    });

    test('Given subscriber, Then fires "broken" on needs mismatch', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      let lastType = '';

      engine.subscribe(() => {
        lastType = engine.getLastEvent()?.type ?? '';
      });

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      // 'z' doesn't match 'times' → broken
      engine.start(ctx(['z']), false);
      expect(lastType).toBe('broken');

      vi.useRealTimers();
    });

    test('Given subscriber, Then fires "aborted" on abort', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      let lastType = '';

      engine.subscribe(() => {
        lastType = engine.getLastEvent()?.type ?? '';
      });

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      engine.abort();
      expect(lastType).toBe('aborted');
    });

    test('Given subscriber, Then fires "undone" and "cleared"', () => {
      vi.useFakeTimers();
      const state = mkState();
      const engine = new CompositionEngine(state);
      const events: string[] = [];

      engine.subscribe(() => {
        events.push(engine.getLastEvent()?.type ?? '');
      });

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
        undoAction: (c) => ({ value: undefined, lastFlag: null, steps: [] }),
      }));

      engine.start(ctx(['3']), false);
      vi.advanceTimersByTime(500);

      events.length = 0;
      engine.undo();
      expect(events).toEqual(['undone']);

      events.length = 0;
      engine.clearBuffers();
      expect(events).toEqual(['cleared']);

      vi.useRealTimers();
    });

    test('Given unsubscribe, Then no more events fire', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);
      let count = 0;

      const unsub = engine.subscribe(() => { count++; });

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      expect(count).toBe(1);

      unsub();

      engine.start(ctx(['3']), false);
      expect(count).toBe(1); // no change

      vi.useRealTimers();
    });

    test('Given no events, Then getLastEvent returns null', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);

      const evt = engine.getLastEvent();
      expect(evt).toBeNull();
    });

    test('Given started event, Then lastEvent contains the matched key name', () => {
      const state = mkState();
      const engine = new CompositionEngine(state);

      engine.registryCompositionKey(mk({
        key: '3', alternativeFlag: 'times', needs: [], optional: true,
        execute: (c) => ({ value: 3, lastFlag: 'times', steps: [...c.steps, '3'] }),
      }));

      engine.start(ctx(['3']), false);
      const evt = engine.getLastEvent();
      expect(evt).not.toBeNull();
      expect(evt!.type).toBe('started');
      expect((evt as { key: string }).key).toBe('3');
    });
  });
});

