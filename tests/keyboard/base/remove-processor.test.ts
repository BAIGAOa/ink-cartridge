import { describe, test, expect } from 'vitest';
import { KeyboardEngine } from '../../../src/keyboard/index.js';
import type { PipelineProcessor } from '../../../src/keyboard/index.js';

function createProcessor(id: string): PipelineProcessor {
  return { id, process: () => false };
}

function createEngine() {
  return new KeyboardEngine({
    normalizeKeyNames: (input: string, _key: unknown) => input ? [input] : [],
  });
}

describe('KeyboardEngine.removeProcessor', () => {
  const DEFAULT_COUNT = 9;

  test('returns false when processor ID does not exist', () => {
    const engine = createEngine();
    const result = engine.removeProcessor('non-existent');
    expect(result).toBe(false);
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT);
  });

  test('removes a custom processor and returns true', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('my-processor'));
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT + 1);

    const result = engine.removeProcessor('my-processor');
    expect(result).toBe(true);
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT);
    expect(engine.getProcessors().find((p) => p.id === 'my-processor')).toBeUndefined();
  });

  test('removing the same processor twice returns false the second time', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('my-processor'));

    expect(engine.removeProcessor('my-processor')).toBe(true);
    expect(engine.removeProcessor('my-processor')).toBe(false);
  });

  test('can remove a built-in processor', () => {
    const engine = createEngine();
    expect(engine.getProcessors().find((p) => p.id === 'modal')).toBeDefined();

    const result = engine.removeProcessor('modal');
    expect(result).toBe(true);
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT - 1);
    expect(engine.getProcessors().find((p) => p.id === 'modal')).toBeUndefined();
  });

  test('removes the correct processor when multiple are registered', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('a'));
    engine.addProcessor(createProcessor('b'));
    engine.addProcessor(createProcessor('c'));

    engine.removeProcessor('b');

    const all = engine.getProcessors();
    expect(all.find((p) => p.id === 'b')).toBeUndefined();
    expect(all.find((p) => p.id === 'a')).toBeDefined();
    expect(all.find((p) => p.id === 'c')).toBeDefined();
  });

  test('removing a processor does not affect subsequent addProcessor calls', () => {
    const engine = createEngine();
    engine.addProcessor(createProcessor('a'));
    engine.removeProcessor('a');
    engine.addProcessor(createProcessor('a'));

    const all = engine.getProcessors();
    const matches = all.filter((p) => p.id === 'a');
    expect(matches.length).toBe(1);
  });

  test('returns false for empty string ID (never matches)', () => {
    const engine = createEngine();
    const result = engine.removeProcessor('');
    expect(result).toBe(false);
    expect(engine.getProcessors().length).toBe(DEFAULT_COUNT);
  });
});
