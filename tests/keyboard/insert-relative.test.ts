import { describe, test, expect } from 'vitest';
import { _insertRelative } from '../../src/keyboard/pipeline/chain.js';
import type { PipelineProcessor } from '../../src/keyboard/types.js';

function createProcessor(id: string): PipelineProcessor {
  return { id, process: () => false };
}

const base = (): PipelineProcessor[] => [
  createProcessor('modal'),
  createProcessor('global-sequence-overlay'),
  createProcessor('global-key-overlay'),
  createProcessor('overlay'),
  createProcessor('screen-stack'),
];

describe('_insertRelative', () => {
  describe('positioning', () => {
    test('inserts before a target', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('custom'), target: 'overlay', position: 'before' },
      ]);
      const ids = result.map((p) => p.id);
      expect(ids.indexOf('custom')).toBe(ids.indexOf('overlay') - 1);
    });

    test('inserts after a target', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('custom'), target: 'modal', position: 'after' },
      ]);
      const ids = result.map((p) => p.id);
      expect(ids.indexOf('custom')).toBe(ids.indexOf('modal') + 1);
    });

    test('inserts at the specified index', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('custom'), index: 2 },
      ]);
      expect(result[2].id).toBe('custom');
      expect(result.length).toBe(6);
    });

    test('appends when no target, position, or index given', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('custom') },
      ]);
      expect(result[result.length - 1].id).toBe('custom');
      expect(result.length).toBe(6);
    });
  });

  describe('multiple items', () => {
    test('inserts multiple processors in order', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('first'), target: 'modal', position: 'after' },
        { processor: createProcessor('second'), target: 'modal', position: 'after' },
      ]);
      expect(result.map((p) => p.id)).toEqual([
        'modal', 'second', 'first',
        'global-sequence-overlay', 'global-key-overlay', 'overlay', 'screen-stack',
      ]);
    });

    test('handles multiple items targeting different positions', () => {
      const result = _insertRelative(base(), [
        { processor: createProcessor('after-modal'), target: 'modal', position: 'after' },
        { processor: createProcessor('before-overlay'), target: 'overlay', position: 'before' },
      ]);
      const ids = result.map((p) => p.id);
      expect(ids.indexOf('after-modal')).toBe(ids.indexOf('modal') + 1);
      expect(ids.indexOf('before-overlay')).toBe(ids.indexOf('overlay') - 1);
    });

    test('empty items array is a no-op', () => {
      const original = base();
      const result = _insertRelative(original, []);
      expect(result.map((p) => p.id)).toEqual(original.map((p) => p.id));
      expect(result).not.toBe(original);
    });
  });

  describe('errors', () => {
    test('throws when target not found', () => {
      expect(() =>
        _insertRelative(base(), [
          { processor: createProcessor('custom'), target: 'nonexistent' as any, position: 'before' },
        ]),
      ).toThrow('[ink-cartridge] Cannot insert processor: target "nonexistent" not found');
    });

    test('throws on duplicate ID with built-in', () => {
      expect(() =>
        _insertRelative(base(), [{ processor: createProcessor('modal') }]),
      ).toThrow('[ink-cartridge] Cannot insert processor: duplicate id "modal"');
    });

    test('throws on duplicate ID within extras', () => {
      expect(() =>
        _insertRelative(base(), [
          { processor: createProcessor('custom'), index: 0 },
          { processor: createProcessor('custom'), index: 1 },
        ]),
      ).toThrow('[ink-cartridge] Cannot insert processor: duplicate id "custom"');
    });
  });
});
