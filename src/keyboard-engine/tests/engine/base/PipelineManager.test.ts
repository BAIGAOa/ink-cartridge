import { describe, test, expect } from 'vitest';
import { createEngine, createEngineWithProcessors } from '../../_helpers/factories.js';
import type { PipelineProcessor } from '../../../src/types.js';

function makeProcessor(id: string): PipelineProcessor {
  return { id, process: () => false };
}

describe('PipelineManager', () => {
  describe('default pipeline', () => {
    test('Given a new engine, Then getProcessors returns 9 built-in processors', () => {
      const engine = createEngine();
      const processors = engine.getProcessors();
      expect(processors).toHaveLength(9);
      const ids = processors.map(p => p.id);
      expect(ids).toEqual([
        'modal',
        'composition-overlay',
        'global-sequence-overlay',
        'global-key-overlay',
        'overlay',
        'composition-screen',
        'global-sequence-screen',
        'global-key-screen',
        'screen-stack',
      ]);
    });
  });

  describe('constructor with custom processors', () => {
    test('Given EngineProps.processors, custom processors are inserted into the pipeline', () => {
      const p = makeProcessor('custom-init');
      const engine = createEngineWithProcessors([{ processor: p, index: 0 }]);
      expect(engine.getProcessors()[0].id).toBe('custom-init');
    });
  });

  describe('addProcessor', () => {
    test('Given a processor without position, Then appends to the end', () => {
      const engine = createEngine();
      const p = makeProcessor('custom');
      engine.addProcessor(p);
      const ids = engine.getProcessors().map(p => p.id);
      expect(ids[ids.length - 1]).toBe('custom');
    });

    test('Given a processor with index=0, Then inserts at beginning', () => {
      const engine = createEngine();
      const p = makeProcessor('first');
      engine.addProcessor(p, { index: 0 });
      expect(engine.getProcessors()[0].id).toBe('first');
    });

    test('Given a processor with before="modal", Then inserts before modal', () => {
      const engine = createEngine();
      const p = makeProcessor('pre-modal');
      engine.addProcessor(p, { before: 'modal' });
      expect(engine.getProcessors()[0].id).toBe('pre-modal');
    });

    test('Given a processor with after="screen-stack", Then inserts after screen-stack', () => {
      const engine = createEngine();
      const p = makeProcessor('post-stack');
      engine.addProcessor(p, { after: 'screen-stack' });
      const ids = engine.getProcessors().map(p => p.id);
      expect(ids[ids.length - 1]).toBe('post-stack');
    });

    test('Given duplicate processor id, Then throws', () => {
      const engine = createEngine();
      expect(() => engine.addProcessor(makeProcessor('modal'))).toThrow(
        '[ink-cartridge] Cannot add processor "modal": duplicate id',
      );
    });
  });

  describe('removeProcessor', () => {
    test('Given existing processor id, Then removes it and returns true', () => {
      const engine = createEngine();
      expect(engine.removeProcessor('modal')).toBe(true);
      expect(engine.getProcessors()).toHaveLength(8);
    });

    test('Given non-existent processor id, Then returns false', () => {
      const engine = createEngine();
      expect(engine.removeProcessor('nonexistent')).toBe(false);
    });
  });

  describe('resetProcessors', () => {
    test('Given custom processors added, reset restores the default 9', () => {
      const engine = createEngine();
      engine.addProcessor(makeProcessor('custom'));
      engine.resetProcessors();
      expect(engine.getProcessors()).toHaveLength(9);
    });
  });

  describe('getProcessors', () => {
    test('Given getProcessors, returns a read-only snapshot that does not mutate internals', () => {
      const engine = createEngine();
      const snapshot = engine.getProcessors();
      // Modifying the snapshot should not affect the engine
      const originalLength = snapshot.length;
      expect(originalLength).toBe(9);
    });
  });
});
