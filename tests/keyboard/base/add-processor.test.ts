import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  addProcessor,
  resetProcessors,
  _thereIsRepetition,
  _getProcessors,
} from '../../../src/keyboard/pipeline/chain.js';
import type { PipelineProcessor } from '../../../src/keyboard/types.js';

/**
 * Create a minimal PipelineProcessor stub for testing.
 * Only `id` is meaningful — `process` is a no-op that returns false.
 */
function createProcessor(id: string): PipelineProcessor {
  return {
    id,
    process: () => false,
  };
}



describe('thereIsRepetition', () => {
  test('returns false for empty array', () => {
    const result = _thereIsRepetition([]);
    expect(result).toEqual({ hasRepetition: false, duplicateIds: [] });
  });

  test('returns false when all IDs are unique', () => {
    const processors = [
      createProcessor('a'),
      createProcessor('b'),
      createProcessor('c'),
    ];
    const result = _thereIsRepetition(processors);
    expect(result).toEqual({ hasRepetition: false, duplicateIds: [] });
  });

  test('returns true with the duplicate ID when one duplicate exists', () => {
    const processors = [
      createProcessor('a'),
      createProcessor('b'),
      createProcessor('a'), // duplicate
    ];
    const result = _thereIsRepetition(processors);
    expect(result).toEqual({ hasRepetition: true, duplicateIds: ['a'] });
  });

  test('returns all duplicate IDs when multiple duplicates exist', () => {
    const processors = [
      createProcessor('a'),
      createProcessor('b'),
      createProcessor('a'),
      createProcessor('c'),
      createProcessor('b'),
    ];
    const result = _thereIsRepetition(processors);
    expect(result).toEqual({ hasRepetition: true, duplicateIds: ['a', 'b'] });
  });

  test('only returns duplicated IDs, not uniquely appearing ones', () => {
    const processors = [
      createProcessor('modal'),
      createProcessor('overlay'),
      createProcessor('modal'),
      createProcessor('screen-stack'),
      createProcessor('overlay'),
    ];
    const result = _thereIsRepetition(processors);
    expect(result.hasRepetition).toBe(true);
    expect(result.duplicateIds.sort()).toEqual(['modal', 'overlay']);
  });

  test('returns empty when every id appears exactly once', () => {
    const processors = [
      createProcessor('a'),
      createProcessor('b'),
      createProcessor('c'),
      createProcessor('d'),
      createProcessor('e'),
    ];
    const result = _thereIsRepetition(processors);
    expect(result).toEqual({ hasRepetition: false, duplicateIds: [] });
  });
});



describe('addProcessor', () => {
  const DEFAULT_COUNT = 7;

  beforeEach(() => {
    resetProcessors();
  });

  afterEach(() => {
    resetProcessors();
  });

  test('throws when adding a processor with a duplicate ID', () => {
    expect(() => addProcessor(createProcessor('modal'))).toThrow(
      '[ink-cartridge] Cannot add processor "modal": duplicate id "modal"',
    );
  });

  test('throws when before target does not exist', () => {
    expect(() =>
      addProcessor(createProcessor('my-processor'), { before: 'non-existent' }),
    ).toThrow(
      '[ink-cartridge] Cannot insert before "non-existent": processor not found',
    );
  });

  test('throws when after target does not exist', () => {
    expect(() =>
      addProcessor(createProcessor('my-processor'), { after: 'ghost' }),
    ).toThrow(
      '[ink-cartridge] Cannot insert after "ghost": processor not found',
    );
  });

  test('appends to the end when no options given', () => {
    addProcessor(createProcessor('my-processor'));

    const all = _getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    expect(all[DEFAULT_COUNT].id).toBe('my-processor');
  });

  test('inserts at the specified index', () => {
    addProcessor(createProcessor('inserted'), { index: 2 });

    const all = _getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    // index 0, 1, then 2 = inserted, then the previous 2→3, 3→4...
    expect(all[2].id).toBe('inserted');
    expect(all[3].id).toBe('global-key-overlay');
    expect(all[4].id).toBe('overlay');
  });

  test('inserts before a named processor', () => {
    addProcessor(createProcessor('before-overlay'), { before: 'overlay' });

    const all = _getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    // overlay is at index 3 originally → shifted to 4
    expect(all[3].id).toBe('before-overlay');
    expect(all[4].id).toBe('overlay');
  });

  test('inserts after a named processor', () => {
    addProcessor(createProcessor('after-modal'), { after: 'modal' });

    const all = _getProcessors();
    expect(all.length).toBe(DEFAULT_COUNT + 1);
    // modal is at index 0 → after-modal should be at 1
    expect(all[1].id).toBe('after-modal');
    expect(all[0].id).toBe('modal');
  });

  test('does not mutate the array when duplicate ID is rejected', () => {
    expect(() => addProcessor(createProcessor('overlay'))).toThrow();
    // Array should still have exactly 7 items
    expect(_getProcessors().length).toBe(DEFAULT_COUNT);
  });

  test('does not mutate the array when before target is not found', () => {
    expect(() =>
      addProcessor(createProcessor('p'), { before: 'nowhere' }),
    ).toThrow();
    expect(_getProcessors().length).toBe(DEFAULT_COUNT);
  });
});
