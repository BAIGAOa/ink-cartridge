import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  addProcessor,
  removeProcessor,
  resetProcessors,
  _getProcessors,
} from '../../../src/keyboard/pipeline/chain.js';
import type { PipelineProcessor } from '../../../src/keyboard/types.js';

function createProcessor(id: string): PipelineProcessor {
  return {
    id,
    process: () => false,
  };
}

describe('removeProcessor', () => {
  const DEFAULT_COUNT = 7;

  beforeEach(() => {
    resetProcessors();
  });

  afterEach(() => {
    resetProcessors();
  });

  test('returns false when processor ID does not exist', () => {
    const result = removeProcessor('non-existent');
    expect(result).toBe(false);
    expect(_getProcessors().length).toBe(DEFAULT_COUNT);
  });

  test('removes a custom processor and returns true', () => {
    addProcessor(createProcessor('my-processor'));
    expect(_getProcessors().length).toBe(DEFAULT_COUNT + 1);

    const result = removeProcessor('my-processor');
    expect(result).toBe(true);
    expect(_getProcessors().length).toBe(DEFAULT_COUNT);
    expect(_getProcessors().find((p) => p.id === 'my-processor')).toBeUndefined();
  });

  test('removing the same processor twice returns false the second time', () => {
    addProcessor(createProcessor('my-processor'));

    expect(removeProcessor('my-processor')).toBe(true);
    expect(removeProcessor('my-processor')).toBe(false);
  });

  test('can remove a built-in processor', () => {
    expect(_getProcessors().find((p) => p.id === 'modal')).toBeDefined();

    const result = removeProcessor('modal');
    expect(result).toBe(true);
    expect(_getProcessors().length).toBe(DEFAULT_COUNT - 1);
    expect(_getProcessors().find((p) => p.id === 'modal')).toBeUndefined();
  });

  test('removes the correct processor when multiple are registered', () => {
    addProcessor(createProcessor('a'));
    addProcessor(createProcessor('b'));
    addProcessor(createProcessor('c'));

    removeProcessor('b');

    const all = _getProcessors();
    expect(all.find((p) => p.id === 'b')).toBeUndefined();
    expect(all.find((p) => p.id === 'a')).toBeDefined();
    expect(all.find((p) => p.id === 'c')).toBeDefined();
  });

  test('removing a processor does not affect subsequent addProcessor calls', () => {
    addProcessor(createProcessor('a'));
    removeProcessor('a');
    addProcessor(createProcessor('a'));

    const all = _getProcessors();
    const matches = all.filter((p) => p.id === 'a');
    expect(matches.length).toBe(1);
  });

  test('returns false for empty string ID (never matches)', () => {
    const result = removeProcessor('');
    expect(result).toBe(false);
    expect(_getProcessors().length).toBe(DEFAULT_COUNT);
  });
});
