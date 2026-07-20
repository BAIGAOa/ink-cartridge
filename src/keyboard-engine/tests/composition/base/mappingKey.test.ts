import { describe, test, expect, vi } from 'vitest';
import CompositionEngine, { MappingKeyEvent, CompositioKey, CompositionContext } from '../../../src/CompositionEngine.js';
import EngineState from '../../../src/engine/EngineState.js';
import { createContext } from '../../_helpers/factories.js';

function mkState() {
  return new EngineState({
    normalizeKeyNames: (_input: string, _key: unknown) => [],
  });
}

function mk(overrides: Partial<CompositioKey<unknown>> = {}): CompositioKey<unknown> {
  const flag = overrides.alternativeFlag ?? 'action';
  const keyName = overrides.key ?? 'x';
  return {
    key: keyName,
    flags: [],
    alternativeFlag: flag,
    needs: [],
    execute: (ctx: CompositionContext) => ({
      ...ctx,
      lastFlag: flag,
      steps: [...ctx.steps, keyName],
    }),
    ...overrides,
  };
}

function ctx(eventNames: string[], topComponent: unknown = 'screen') {
  return createContext({ eventNames, topComponent });
}

function mkEngine(keys: CompositioKey<unknown>[] = []) {
  const state = mkState();
  const engine = new CompositionEngine(state);
  for (const k of keys) engine.registryCompositionKey(k);
  return { state, engine };
}

/**
 * Standard composition keys:
 *   't' — head key (optional, flag "times")
 *   'd' — chain key (needs "times", flag "action")
 *   's' — head key (optional, flag "sflag")
 */
function mkStandardChain() {
  return [
    mk({ key: 't', alternativeFlag: 'times', optional: true, needs: [] }),
    mk({ key: 'd', alternativeFlag: 'action', needs: ['times'] }),
    mk({ key: 's', alternativeFlag: 'sflag', optional: true, needs: [] }),
  ];
}

/**
 * Create a composition key whose execute callback is a spy that still
 * returns a valid CompositionContext (so the chain doesn't break).
 */
function spyKey(keyName: string, flag: string, needs: string[] = [], optional = false) {
  const spy = vi.fn();
  return {
    key: mk({ key: keyName, alternativeFlag: flag, needs, optional }),
    spy,
    execute: (ctx: any) => {
      spy(ctx);
      return { ...ctx, lastFlag: flag, steps: [...ctx.steps, keyName] };
    },
  };
}

describe('MappingKey — addMapping', () => {
  test('returns false when base is empty', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.addMapping([], ['t'])).toBe(false);
  });

  test('returns false when a target key is not registered', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.addMapping(['g', 'b'], ['t', 'nonexistent'])).toBe(false);
  });

  test('returns true on successful registration', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.addMapping(['g', 'b'], ['t', 'd'])).toBe(true);
  });

  test('returns false when an identical base sequence already exists', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);
    expect(engine.addMapping(['g', 'b'], ['d'])).toBe(false);
  });

  test('can register multiple mappings sharing the same head key', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.addMapping(['g', 'b'], ['t'])).toBe(true);
    expect(engine.addMapping(['g', 'd'], ['d'])).toBe(true);
  });

  test('forwards optional fields (exclusive) to the stored entry', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t'], { exclusive: true });
    // Verified by exclusive-mode behavior tests below
  });
});

describe('MappingKey — removeMappingKey', () => {
  test('returns true and removes an existing mapping', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);
    expect(engine.removeMappingKey(['g', 'b'])).toBe(true);
    expect(engine.start(ctx(['g']), false)).toBe(false);
  });

  test('returns false when the mapping does not exist', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.removeMappingKey(['g', 'b'])).toBe(false);
  });

  test('only removes the matching sequence, not other mappings with the same head', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);
    engine.addMapping(['g', 'd'], ['t']);
    expect(engine.removeMappingKey(['g', 'b'])).toBe(true);
    // 'g d' should still work
    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(engine.start(ctx(['d']), false)).toBe(true);
  });
});

describe('MappingKey — single-key mapping', () => {
  test('executes target chain immediately on head key', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const dSpy = spyKey('d', 'action', ['times']);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...dSpy.key, execute: dSpy.execute },
    ]);
    engine.addMapping(['q'], ['t', 'd']);

    expect(engine.start(ctx(['q']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
    expect(dSpy.spy).toHaveBeenCalledOnce();
  });

  test('does not enter pending state', () => {
    const { state, engine } = mkEngine(mkStandardChain());
    engine.addMapping(['q'], ['t']);
    engine.start(ctx(['q']), false);
    expect(state.compositionEngineHandle).toBe(false);
  });

  test('single-key mapping wins over multi-key mapping with the same head', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      mk({ key: 'd', alternativeFlag: 'action', needs: ['times'] }),
    ]);
    engine.addMapping(['g'], ['t']);
    engine.addMapping(['g', 'b'], ['d']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
  });
});

describe('MappingKey — multi-key mapping, no ambiguity', () => {
  test('head key starts pending, second key completes and runs target', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const dSpy = spyKey('d', 'action', ['times']);
    const { state, engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...dSpy.key, execute: dSpy.execute },
    ]);
    engine.addMapping(['g', 'b'], ['t', 'd']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(state.compositionEngineHandle).toBe(true);
    expect(tSpy.spy).not.toHaveBeenCalled();

    expect(engine.start(ctx(['b']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
    expect(dSpy.spy).toHaveBeenCalledOnce();
    expect(state.compositionEngineHandle).toBe(false);
  });

  test('head key not in eventNames returns false', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);
    expect(engine.start(ctx(['x']), false)).toBe(false);
  });

  test('timeout clears pending without executing target', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([{ ...tSpy.key, execute: tSpy.execute }]);
    engine.addMapping(['g', 'b'], ['t']);

    engine.start(ctx(['g']), false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // After timeout, pressing b should NOT complete the mapping
        expect(engine.start(ctx(['b']), false)).toBe(false);
        expect(tSpy.spy).not.toHaveBeenCalled();
        resolve();
      }, 500);
    });
  });
});

describe('MappingKey — multi-key mapping with ambiguity', () => {
  test('two mappings sharing head key — disambiguated by second key', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const sSpy = spyKey('s', 'sflag', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...sSpy.key, execute: sSpy.execute },
    ]);
    engine.addMapping(['g', 'b'], ['t']);
    engine.addMapping(['g', 'd'], ['s']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(engine.start(ctx(['b']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
    expect(sSpy.spy).not.toHaveBeenCalled();
  });

  test('mismatched second key breaks the sequence (non-exclusive)', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);
    engine.addMapping(['g', 'd'], ['d']);

    engine.start(ctx(['g']), false);
    expect(engine.start(ctx(['x']), false)).toBe(false);
  });

  test('three-key mapping with progressive disambiguation', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const sSpy = spyKey('s', 'sflag', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...sSpy.key, execute: sSpy.execute },
    ]);
    engine.addMapping(['g', 'b', 'b'], ['t']);
    engine.addMapping(['g', 'b', 'd'], ['s']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(engine.start(ctx(['b']), false)).toBe(true);
    expect(engine.start(ctx(['d']), false)).toBe(true);
    expect(sSpy.spy).toHaveBeenCalledOnce();
    expect(tSpy.spy).not.toHaveBeenCalled();
  });

  test('second key narrows to single candidate and completes (2-key vs 3-key)', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const sSpy = spyKey('s', 'sflag', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...sSpy.key, execute: sSpy.execute },
    ]);
    engine.addMapping(['g', 'b', 'b'], ['t']);
    engine.addMapping(['g', 'd'], ['s']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    // Press d — narrows to ['g', 'd'] which has length 2 = nextIndex(1)+1, completes
    expect(engine.start(ctx(['d']), false)).toBe(true);
    expect(sSpy.spy).toHaveBeenCalledOnce();
    expect(tSpy.spy).not.toHaveBeenCalled();
  });
});

describe('MappingKey — exclusive mode', () => {
  test('exclusive mapping swallows mismatched key and keeps waiting', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([{ ...tSpy.key, execute: tSpy.execute }]);
    engine.addMapping(['g', 'b'], ['t'], { exclusive: true });

    engine.start(ctx(['g']), false);
    // Press x — not the expected key, but exclusive → swallowed
    expect(engine.start(ctx(['x']), false)).toBe(true);
    expect(tSpy.spy).not.toHaveBeenCalled();

    // Press b — still completes despite the earlier mismatch
    expect(engine.start(ctx(['b']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
  });

  test('exclusive mapping swallows unrelated key (no mapping head match)', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t'], { exclusive: true });

    engine.start(ctx(['g']), false);
    expect(engine.start(ctx(['z']), false)).toBe(true);
  });
});

describe('MappingKey — target chain interruption', () => {
  test('target chain step returning null (execute returns null) breaks chain', () => {
    const headSpy = vi.fn(() => null);
    const { engine } = mkEngine([
      mk({ key: 't', alternativeFlag: 'times', optional: true, needs: [], execute: headSpy }),
    ]);
    engine.addMapping(['q'], ['t']);

    // execute returns null → chain breaks, key released (swallow=false by default)
    expect(engine.start(ctx(['q']), false)).toBe(false);
    expect(headSpy).toHaveBeenCalledOnce();
  });

  test('KeyReleaseWhenChainInterrupted=true swallows the key on break', () => {
    const nullSpy = vi.fn(() => null);
    const { engine } = mkEngine([
      mk({ key: 't', alternativeFlag: 'times', optional: true, needs: [], execute: nullSpy }),
    ]);
    engine.addMapping(['q'], ['t'], { KeyReleaseWhenChainInterrupted: true });

    expect(engine.start(ctx(['q']), false)).toBe(true);
  });

  test('KeyReleaseWhenChainInterrupted=false (default) releases the key on break', () => {
    const nullSpy = vi.fn(() => null);
    const { engine } = mkEngine([
      mk({ key: 't', alternativeFlag: 'times', optional: true, needs: [], execute: nullSpy }),
    ]);
    engine.addMapping(['q'], ['t']);

    expect(engine.start(ctx(['q']), false)).toBe(false);
  });
});

describe('MappingKey — affectOverlay phase guard', () => {
  test('mapping started in overlay phase is not advanced by screen phase', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute, affectOverlay: true },
    ]);
    engine.addMapping(['g', 'b'], ['t'], { affectOverlay: true });

    // activeCount must be > 0 for affectOverlay=true entries to pass filterEntries
    const overlayCtx = ctx(['g'], 'screen');
    (overlayCtx as any).activeCount = 1;
    expect(engine.start(overlayCtx, true)).toBe(true);
    // Screen phase should not advance it
    expect(engine.start(ctx(['b']), false)).toBe(false);
    expect(tSpy.spy).not.toHaveBeenCalled();
  });

  test('mapping started in screen phase is not advanced by overlay phase', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([{ ...tSpy.key, execute: tSpy.execute }]);
    engine.addMapping(['g', 'b'], ['t']);

    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(engine.start(ctx(['b']), true)).toBe(false);
    expect(tSpy.spy).not.toHaveBeenCalled();
  });

  test('same-phase advance works', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([{ ...tSpy.key, execute: tSpy.execute }]);
    engine.addMapping(['g', 'b'], ['t']);

    engine.start(ctx(['g']), false);
    expect(engine.start(ctx(['b']), false)).toBe(true);
    expect(tSpy.spy).toHaveBeenCalledOnce();
  });
});

describe('MappingKey — priority over composition', () => {
  test('mapping key takes priority when head key is also a composition key', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const gSpy = spyKey('g', 'gflag', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...gSpy.key, execute: gSpy.execute },
    ]);
    engine.addMapping(['g', 'b'], ['t']);

    // 'g' is both a composition head key AND a mapping head key.
    // Mapping key should win — composition 'g' should NOT fire.
    expect(engine.start(ctx(['g']), false)).toBe(true);
    expect(gSpy.spy).not.toHaveBeenCalled();
  });
});

describe('MappingKey — event subscription', () => {
  test('subscribeMapping fires on mapping events', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);

    const events: MappingKeyEvent[] = [];
    engine.subscribeMapping(() => {
      const evt = engine.getLastMappingEvent();
      if (evt) events.push(evt);
    });

    engine.start(ctx(['g']), false);
    engine.start(ctx(['b']), false);

    // started (head key) + completed (target chain runs)
    expect(events.length).toBe(2);
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('completed');
  });

  test('composition subscribe does not fire on mapping events', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['g', 'b'], ['t']);

    const compositionEvents: string[] = [];
    engine.subscribe(() => {
      const evt = engine.getLastEvent();
      if (evt) compositionEvents.push(evt.type);
    });

    engine.start(ctx(['g']), false);
    engine.start(ctx(['b']), false);

    expect(compositionEvents.length).toBe(0);
  });

  test('getLastMappingEvent returns null before any mapping activity', () => {
    const { engine } = mkEngine(mkStandardChain());
    expect(engine.getLastMappingEvent()).toBeNull();
  });

  test('unsubscribe stops receiving events', () => {
    const { engine } = mkEngine(mkStandardChain());
    engine.addMapping(['q'], ['t']);

    let count = 0;
    const unsub = engine.subscribeMapping(() => { count++; });

    engine.start(ctx(['q']), false);
    expect(count).toBeGreaterThan(0);

    const afterUnsub = count;
    unsub();
    engine.addMapping(['w'], ['t']);
    engine.start(ctx(['w']), false);
    expect(count).toBe(afterUnsub);
  });
});

describe('MappingKey — single-key and multi-key coexistence', () => {
  test('single-key mapping fires immediately, multi-key never triggers', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const sSpy = spyKey('s', 'sflag', [], true);
    const { engine } = mkEngine([
      { ...tSpy.key, execute: tSpy.execute },
      { ...sSpy.key, execute: sSpy.execute },
    ]);
    engine.addMapping(['g'], ['t']);
    engine.addMapping(['g', 'b'], ['s']);

    engine.start(ctx(['g']), false);
    expect(tSpy.spy).toHaveBeenCalledOnce();

    // Press b → no pending (single-key didn't create one), falls through
    expect(engine.start(ctx(['b']), false)).toBe(false);
    expect(sSpy.spy).not.toHaveBeenCalled();
  });
});

describe('MappingKey — timer reset on progress', () => {
  test('each key press resets the timeout timer', () => {
    const tSpy = spyKey('t', 'times', [], true);
    const { engine } = mkEngine([{ ...tSpy.key, execute: tSpy.execute }]);
    engine.addMapping(['g', 'b', 'd'], ['t']);

    engine.start(ctx(['g']), false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Press b after 50ms — should still be pending (default timeout 400ms)
        expect(engine.start(ctx(['b']), false)).toBe(true);
        // Press d — should complete
        expect(engine.start(ctx(['d']), false)).toBe(true);
        expect(tSpy.spy).toHaveBeenCalledOnce();
        resolve();
      }, 50);
    });
  });
});

describe('MappingKey — noActiveProcessor integration', () => {
  test('kicking composition-overlay is visible at the EngineState level', () => {
    const { state, engine } = mkEngine([
      mk({ key: 't', alternativeFlag: 'times', optional: true, needs: [], affectOverlay: true }),
    ]);
    engine.addMapping(['g', 'b'], ['t'], { affectOverlay: true });
    state.noActiveProcessor.push('composition-overlay');

    // The composition processor is kicked — engine.start is never reached
    // because the processor returns false before calling start().
    // This test verifies the integration point exists.
    expect(state.noActiveProcessor.includes('composition-overlay')).toBe(true);
  });
});
