import { describe, test, expect, vi } from 'vitest';
import { createGlobalSequenceProcessor } from '../../../src/processors/globalSequence.js';
import { createContext, resolveGlobalSequence, makeGlobalSequenceEntry } from '../../_helpers/factories.js';

describe('createGlobalSequenceProcessor', () => {
  const screenProc = createGlobalSequenceProcessor({ affectOverlay: false });

  describe('try start new sequence', () => {
    test('Given matching first key with valid entry, Then creates pending sequence', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: 'screen',
        globalSequences: [resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate }))],
        notifyPendingSyncs: vi.fn(),
      });
      const result = screenProc.process(ctx);
      expect(result).toBe(true);
      expect(ctx.pendingSeqRef.current).not.toBeNull();
      expect(ctx.pendingSeqRef.current!.sequences).toEqual(['g', 'g']);
    });

    test('Given affectOverlay mismatch, Then skips', () => {
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate: () => {}, affectOverlay: true })),
        ],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given mode mismatch, Then skips', () => {
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: 'screen',
        currentMode: 'normal',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate: () => {}, mode: 'insert' })),
        ],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given when=false, Then skips', () => {
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate: () => {}, when: () => false })),
        ],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given no topComponent, Then skips', () => {
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: null,
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate: () => {} })),
        ],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given first key does not match, Then returns false', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate: () => {} })),
        ],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });
  });

  describe('process pending sequence', () => {
    test('Given no pending sequence, Then returns false from processGlobalPending (moves to tryStart)', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalSequences: [],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given pending with matching next key that completes the sequence, Then fires handler', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['g'],
        topComponent: 'screen',
        globalSequences: [resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['g', 'g'], operate }))],
        notifyPendingSyncs: vi.fn(),
      });
      // Start the sequence
      screenProc.process(ctx);
      // Now complete it
      const result = screenProc.process(ctx);
      expect(result).toBe(true);
      expect(operate).toHaveBeenCalled();
      expect(ctx.pendingSeqRef.current).toBeNull();
    });

    test('Given pending with matching next key (not last), Then advances and continues waiting', () => {
      const ctx = createContext({
        eventNames: ['a'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['a', 'b', 'c'], operate: () => {} })),
        ],
        notifyPendingSyncs: vi.fn(),
      });
      screenProc.process(ctx); // start
      // Create a new context for the second key press instead of mutating
      const ctx2 = createContext({
        eventNames: ['b'],
        topComponent: 'screen',
        globalSequences: ctx.globalSequences,
        layersRef: ctx.layersRef,
        pendingSeqRef: ctx.pendingSeqRef,
        notifyPendingSyncs: vi.fn(),
      });
      const result = screenProc.process(ctx2); // advance
      expect(result).toBe(true);
      expect(ctx2.pendingSeqRef.current!.nextIndex).toBe(2);
      expect(ctx2.pendingSeqRef.current).not.toBeNull();
    });

    test('Given pending with exclusive=true, mismatch is silently consumed', () => {
      const ctx = createContext({
        eventNames: ['a'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['a', 'b'], operate: () => {}, exclusive: true })),
        ],
        notifyPendingSyncs: vi.fn(),
      });
      screenProc.process(ctx); // start
      const ctx2 = createContext({
        eventNames: ['x'], // mismatch
        topComponent: 'screen',
        globalSequences: ctx.globalSequences,
        layersRef: ctx.layersRef,
        pendingSeqRef: ctx.pendingSeqRef,
        notifyPendingSyncs: vi.fn(),
      });
      const result = screenProc.process(ctx2);
      expect(result).toBe(true); // consumed silently
      expect(ctx2.pendingSeqRef.current).not.toBeNull(); // still pending
    });

    test('Given pending with when changed to false, Then cancels pending', () => {
      const ctx = createContext({
        eventNames: ['a'],
        topComponent: 'screen',
        globalSequences: [
          resolveGlobalSequence(makeGlobalSequenceEntry({ keys: ['a', 'b'], operate: () => {}, when: () => true })),
        ],
        notifyPendingSyncs: vi.fn(),
      });
      screenProc.process(ctx); // start
      // Modify the pending sequence's when to return false
      ctx.pendingSeqRef.current!.when = () => false;
      const ctx2 = createContext({
        eventNames: ['b'],
        topComponent: 'screen',
        globalSequences: ctx.globalSequences,
        layersRef: ctx.layersRef,
        pendingSeqRef: ctx.pendingSeqRef,
        notifyPendingSyncs: vi.fn(),
      });
      const result = screenProc.process(ctx2);
      expect(result).toBe(false);
      expect(ctx2.pendingSeqRef.current).toBeNull();
    });
  });
});
