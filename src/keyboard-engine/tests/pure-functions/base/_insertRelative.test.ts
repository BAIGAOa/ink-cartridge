import { describe, test, expect } from 'vitest';
import { _insertRelative, BuiltinProcessorId } from '../../../src/pipeline/chain.js';
import type { PipelineProcessor, KeyboardProcessorProps } from '../../../src/types.js';

function makeProcessor(id: string): PipelineProcessor {
  return { id, process: () => false };
}

function props(
  processor: PipelineProcessor,
  overrides?: Partial<KeyboardProcessorProps>,
): KeyboardProcessorProps {
  return { processor, ...overrides };
}

describe('_insertRelative', () => {
  const base = [
    makeProcessor('modal'),
    makeProcessor('overlay'),
    makeProcessor('screen-stack'),
  ];

  describe('default append', () => {
    test('Given no position/index/target, Then appends to the end', () => {
      const p = makeProcessor('custom');
      const result = _insertRelative(base, [props(p)]);
      expect(result.map(r => r.id)).toEqual(['modal', 'overlay', 'screen-stack', 'custom']);
    });
  });

  describe('insert by index', () => {
    test('Given index=0, Then inserts at the beginning', () => {
      const p = makeProcessor('first');
      const result = _insertRelative(base, [props(p, { index: 0 })]);
      expect(result.map(r => r.id)).toEqual(['first', 'modal', 'overlay', 'screen-stack']);
    });

    test('Given index=2, Then inserts at index 2', () => {
      const p = makeProcessor('mid');
      const result = _insertRelative(base, [props(p, { index: 2 })]);
      expect(result.map(r => r.id)).toEqual(['modal', 'overlay', 'mid', 'screen-stack']);
    });
  });

  describe('insert by target+position', () => {
    test('Given target="overlay" position="before", Then inserts before overlay', () => {
      const p = makeProcessor('before-overlay');
      const result = _insertRelative(
        base,
        [props(p, { target: 'overlay', position: 'before' })],
      );
      expect(result.map(r => r.id)).toEqual(['modal', 'before-overlay', 'overlay', 'screen-stack']);
    });

    test('Given target="overlay" position="after", Then inserts after overlay', () => {
      const p = makeProcessor('after-overlay');
      const result = _insertRelative(
        base,
        [props(p, { target: 'overlay', position: 'after' })],
      );
      expect(result.map(r => r.id)).toEqual(['modal', 'overlay', 'after-overlay', 'screen-stack']);
    });
  });

  describe('multiple items', () => {
    test('Given multiple items, processes sequentially (later indices based on earlier results)', () => {
      const p1 = makeProcessor('x');
      const p2 = makeProcessor('y');
      const result = _insertRelative(base, [
        props(p1, { index: 1 }),
        props(p2),
      ]);
      expect(result.map(r => r.id)).toEqual(['modal', 'x', 'overlay', 'screen-stack', 'y']);
    });
  });

  describe('error paths', () => {
    test('Given duplicate ID, Then throws', () => {
      const p = makeProcessor('modal');
      expect(() => _insertRelative(base, [props(p)])).toThrow(
        '[ink-cartridge] Cannot insert processor: duplicate id "modal"',
      );
    });

    test('Given target not found, Then throws', () => {
      const p = makeProcessor('new');
      expect(() =>
        _insertRelative(base, [
          props(p, { target: 'global-sequence-overlay' as BuiltinProcessorId, position: 'before' }),
        ]),
      ).toThrow(
        '[ink-cartridge] Cannot insert processor: target "global-sequence-overlay" not found',
      );
    });
  });

  describe('edge cases', () => {
    test('Given empty array and empty items, Then returns empty array', () => {
      expect(_insertRelative([], [])).toEqual([]);
    });

    test('Given empty array and one item, Then returns array with only that item', () => {
      const p = makeProcessor('only');
      const result = _insertRelative([], [props(p)]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('only');
    });
  });
});
