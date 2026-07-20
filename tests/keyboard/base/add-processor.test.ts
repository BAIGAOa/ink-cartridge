import { describe, test, expect } from 'vitest';
import { KeyboardEngine } from '../../../src/keyboard/index.js';
import type { PipelineProcessor } from '../../../src/keyboard/index.js';

function createProcessor(id: string): PipelineProcessor<unknown> {
  return { id, process: () => false };
}

function createEngine() {
  return new KeyboardEngine({
    normalizeKeyNames: (input: string, _key: unknown) => input ? [input] : [],
  });
}

describe('KeyboardEngine.addProcessor', () => {
  const DEFAULT_COUNT = 9;

  test('throws when adding a processor with a duplicate ID', () => {
    const engine = createEngine();
    expect(() => engine.addProcessor(createProcessor('modal'))).toThrow(
      '[ink-cartridge] Cannot add processor "modal": duplicate id',
    );
  });

  test('throws when before target does not exist', () => {
    const engine = createEngine();
    expect(() =>
      engine.addProcessor(createProcessor('my-processor'), { before: 'non-existent' }),
    ).toThrow(
      '[ink-cartridge] Cannot insert before "non-existent": processor not found',
    );
  });

  test('throws when after target does not exist', () => {
    const engine = createEngine();
    expect(() =>
      engine.addProcessor(createProcessor('my-processor'), { after: 'ghost' }),
    ).toThrow(
      '[ink-cartridge] Cannot insert after "ghost": processor not found',
    );
  });

  test('appends to the end when no options given', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('my-processor'));

    const all = engine.getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    expect(all[DEFAULT_COUNT].id).toBe('my-processor');
  });

  test('inserts at the specified index', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('inserted'), { index: 2 });

    const all = engine.getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    expect(all[2].id).toBe('inserted');
    expect(all[3].id).toBe('global-sequence-overlay');
    expect(all[4].id).toBe('global-key-overlay');
  });

  test('inserts before a named processor', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('before-overlay'), { before: 'overlay' });

    const all = engine.getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    expect(all[4].id).toBe('before-overlay');
    expect(all[5].id).toBe('overlay');
  });

  test('inserts after a named processor', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('after-modal'), { after: 'modal' });

    const all = engine.getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    expect(all[1].id).toBe('after-modal');
    expect(all[0].id).toBe('modal');
  });

  test('does not mutate the array when duplicate ID is rejected', () => {
    const engine = createEngine();
    expect(() => engine.addProcessor(createProcessor('overlay'))).toThrow();
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT);
  });

  test('does not mutate the array when before target is not found', () => {
    const engine = createEngine();
    expect(() =>
      engine.addProcessor(createProcessor('p'), { before: 'nowhere' }),
    ).toThrow();
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT);
  });
});
