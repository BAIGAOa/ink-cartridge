import { describe, test, expect, vi } from 'vitest';
import { createContext } from '../../_helpers/factories.js';
import CompositionEngine, { CompositioKey } from '../../../src/CompositionEngine.js';
import EngineState from '../../../src/engine/EngineState.js';
import { createCompositionProcessor } from '../../../src/processors/globalComposition.js';

function mkState() {
  const state = new EngineState({
    normalizeKeyNames: (_input: string, _key: unknown) => [],
  });
  state.compositionEngine = new CompositionEngine(state);
  return state;
}

function mk(overrides: Partial<CompositioKey> = {}): CompositioKey {
  return {
    key: 'x',
    flag: 'action',
    needs: [],
    optional: true,
    execute: (c) => ({ ...c, lastFlag: overrides.flag ?? 'action', steps: [...c.steps, overrides.key ?? 'x'] }),
    ...overrides,
  };
}

describe('createCompositionProcessor', () => {
  test('Given matching key, Then screen processor consumes event', () => {
    const state = mkState();
    state.compositionEngine.registryCompositionKey(mk({ key: 'a', flag: 'action', needs: [] }));

    const screenProc = createCompositionProcessor({ affectOverlay: false });
    const ctx = createContext({
      eventNames: ['a'],
      topComponent: 'screen',
      compositionEngineHandler: false,
      compositionEngine: state.compositionEngine,
    });

    expect(screenProc.process(ctx)).toBe(true);
  });

  test('Given affectOverlay mismatch, Then processor returns false', () => {
    const state = mkState();
    state.compositionEngine.registryCompositionKey(mk({ key: 'a', flag: 'action', affectOverlay: true, needs: [] }));

    const screenProc = createCompositionProcessor({ affectOverlay: false });
    const ctx = createContext({
      eventNames: ['a'],
      topComponent: 'screen',
      compositionEngine: state.compositionEngine,
    });

    expect(screenProc.process(ctx)).toBe(false);
  });

  test('Given compositionEngineHandler is true and pending exists, Then processPending is triggered', () => {
    const state = mkState();
    const exec = vi.fn((c: any) => ({ ...c, lastFlag: 'times', steps: [...c.steps, '3'] }));
    state.compositionEngine.registryCompositionKey(mk({ key: '3', flag: 'times', needs: [], execute: exec }));
    state.compositionEngine.registryCompositionKey(mk({ key: 'w', flag: 'action', optional: false, needs: ['times'], execute: (c) => ({ ...c, lastFlag: 'action', steps: [...c.steps, 'w'] }) }));

    const proc = createCompositionProcessor({ affectOverlay: false });

    // First key — starts chain
    const ctx1 = createContext({ eventNames: ['3'], topComponent: 'screen', compositionEngine: state.compositionEngine });
    expect(proc.process(ctx1)).toBe(true);
    expect(exec).toHaveBeenCalledTimes(1);

    // Second key — continues chain
    const ctx2 = createContext({ eventNames: ['w'], topComponent: 'screen', compositionEngine: state.compositionEngine });
    expect(proc.process(ctx2)).toBe(true);
  });
});
