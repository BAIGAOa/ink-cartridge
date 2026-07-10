import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';

describe('sequence disambiguation', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given two global sequences sharing first key, first matching subsequent key wins', () => {
    const engine = createEngine();
    setup(engine);
    const op1 = vi.fn();
    const op2 = vi.fn();
    engine.globalSequence([
      { keys: ['g', 'g'], operate: op1 },
      { keys: ['g', 't'], operate: op2 },
    ]);
    engine.processKey('g', {}); // start pending, candidates=[seq1, seq2]
    engine.processKey('t', {}); // matches seq2 — should fire op2
    expect(op2).toHaveBeenCalled();
    expect(op1).not.toHaveBeenCalled();
  });

  test('Given two global sequences sharing first key, exclusive mode keeps pending on mismatch', () => {
    const engine = createEngine();
    setup(engine);
    const op1 = vi.fn();
    engine.globalSequence([
      { keys: ['g', 'g'], operate: op1, exclusive: true },
    ]);
    engine.processKey('g', {}); // start
    engine.processKey('x', {}); // mismatch, exclusive → consumed silently
    // Still pending
    engine.processKey('g', {}); // this should match (nextIndex is still 1, expecting 'g')
    expect(op1).toHaveBeenCalled();
  });

  test('Given six global sequences sharing first key, disambiguation works with multiple candidates', () => {
    const engine = createEngine();
    setup(engine);
    const op1 = vi.fn();
    const op2 = vi.fn();
    const op3 = vi.fn();
    const op4 = vi.fn();
    const op5 = vi.fn();
    const op6 = vi.fn();
    engine.globalSequence([
      { keys: ['g', 'g'], operate: op1 },
      { keys: ['g', 't'], operate: op2 },
      { keys: ['g', 'd'], operate: op3 },
      { keys: ['g', 'x'], operate: op4 },
      { keys: ['g', 'y'], operate: op5 },
      { keys: ['g', 'z'], operate: op6 },
    ]);
    engine.processKey('g', {}); // all 6 are candidates
    engine.processKey('t', {}); // matches seq2 — fires op2
    expect(op2).toHaveBeenCalled();
    expect(op1).not.toHaveBeenCalled();
  });

  test('Given global sequence with affectOverlay and no overlays, Then skips', () => {
    const engine = createEngine();
    setup(engine);
    const op = vi.fn();
    engine.globalSequence([
      { keys: ['g', 'g'], operate: op, affectOverlay: true },
    ]);
    engine.processKey('g', {});
    expect(op).not.toHaveBeenCalled();
  });

  test('Given global sequence with executeWhenNoOverlay and no overlays, Then fires', () => {
    const engine = createEngine();
    setup(engine);
    const op = vi.fn();
    engine.globalSequence([
      { keys: ['g', 'g'], operate: op, affectOverlay: true, executeWhenNoOverlay: true },
    ]);
    engine.processKey('g', {});
    engine.processKey('g', {});
    expect(op).toHaveBeenCalled();
  });

  test('Given global sequence with 3 keys, disambiguation redirects to matching candidate', () => {
    const engine = createEngine();
    setup(engine);
    const op1 = vi.fn();
    const op2 = vi.fn();
    engine.globalSequence([
      { keys: ['a', 'b', 'c'], operate: op1 },
      { keys: ['a', 'x', 'y'], operate: op2 },
    ]);
    engine.processKey('a', {}); // candidates=[seq1, seq2]
    engine.processKey('x', {}); // mismatch for seq1 → try disambiguate → matches seq2 at index 1
    // Now pending is redirected to seq2 with nextIndex=2, expecting 'y'
    engine.processKey('y', {}); // completes seq2
    expect(op2).toHaveBeenCalled();
    expect(op1).not.toHaveBeenCalled();
  });

  test('Given two non-exclusive candidates sharing first key, mismatch with no candidate match cancels all', () => {
    const engine = createEngine();
    setup(engine);
    const h1 = vi.fn();
    const h2 = vi.fn();
    engine.boundSequence(['a', 'b'], h1);
    engine.boundSequence(['a', 'c'], h2);
    engine.processKey('a', {}); // starts pending with 2 candidates
    engine.processKey('z', {}); // 'z' matches neither → cancel all
    // Check that pending is cleared
    engine.processKey('b', {}); // Should not complete sequence (pending was cancelled)
    expect(h1).not.toHaveBeenCalled();
  });
});
