import { describe, test, expect } from 'vitest';
import { resolveCompositionKey, CompositioKey } from '../../../src/CompositionEngine.js';

function mk(
  overrides: Partial<CompositioKey> = {},
): CompositioKey {
  return {
    key: 'x',
    flag: 'action',
    needs: [],
    ...overrides,
  };
}

describe('resolveCompositionKey', () => {
  describe('empty candidates', () => {
    test('Given an empty array, Then returns null', () => {
      expect(resolveCompositionKey([], null)).toBe(null);
    });
  });

  describe('single candidate', () => {
    test('Given a single candidate with matching needs, Then returns it', () => {
      const entry = mk({ key: 'x', flag: 'times', needs: [] });
      expect(resolveCompositionKey([entry], null)).toBe(entry);
    });
  });

  describe('needs / lastFlag matching', () => {
    test('Given lastFlag is null and entry is optional, Then matches', () => {
      const entry = mk({ optional: true, needs: ['times'] });
      expect(resolveCompositionKey([entry], null)).toBe(entry);
    });

    test('Given lastFlag is null and entry has empty needs, Then matches', () => {
      const entry = mk({ needs: [] });
      expect(resolveCompositionKey([entry], null)).toBe(entry);
    });

    test('Given lastFlag is null and entry is neither optional nor has empty needs, Then filtered out', () => {
      const entry = mk({ optional: false, needs: ['times'] });
      expect(resolveCompositionKey([entry], null)).toBe(null);
    });

    test('Given lastFlag is provided and entry needs includes it, Then matches', () => {
      const entry = mk({ needs: ['times'] });
      expect(resolveCompositionKey([entry], 'times')).toBe(entry);
    });

    test('Given lastFlag is provided and entry needs does not include it, Then filtered out', () => {
      const entry = mk({ needs: ['times'] });
      expect(resolveCompositionKey([entry], 'action')).toBe(null);
    });

    test('Given candidates match needs but some do not, Then only needs-matching is returned', () => {
      const good = mk({ key: 'x', flag: 'action', needs: ['times'] });
      const bad = mk({ key: 'y', flag: 'other', needs: [] });
      expect(resolveCompositionKey([bad, good], 'times')).toBe(good);
    });
  });

  describe('modifier specificity', () => {
    test('Given ctrl+s vs s with same needs, Then modifier-count is preferred', () => {
      const plain = mk({ key: 's', flag: 'action', needs: [] });
      const ctrl = mk({ key: 'ctrl+s', flag: 'action', needs: [] });
      expect(resolveCompositionKey([plain, ctrl], null)).toBe(ctrl);
    });

    test('Given multiple modifier keys, Then the one with more modifiers wins', () => {
      const one = mk({ key: 'ctrl+s', flag: 'action', needs: [] });
      const two = mk({ key: 'ctrl+shift+s', flag: 'action', needs: [] });
      expect(resolveCompositionKey([one, two], null)).toBe(two);
    });
  });

  describe('needs length tiebreaker', () => {
    test('Given same modifier count, Then longer needs list wins', () => {
      const loose = mk({ key: 's', flag: 'action', needs: ['a'] });
      const strict = mk({ key: 's', flag: 'action', needs: ['a', 'b'] });
      // Both pass round 1 (needs include 'a'), same key, same modifier count.
      expect(resolveCompositionKey([loose, strict], 'a')).toBe(strict);
    });
  });
});
