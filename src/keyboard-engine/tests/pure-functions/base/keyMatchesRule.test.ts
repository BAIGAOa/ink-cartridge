import { describe, test, expect } from 'vitest';
import { keyMatchesRule } from '../../../src/layerHandler.js';

describe('keyMatchesRule', () => {
  describe('basic scenarios', () => {
    test('Given a single rule with matching key and no when, Then returns true', () => {
      expect(
        keyMatchesRule('a', [{ key: 'a' }], new Map()),
      ).toBe(true);
    });

    test('Given a single rule with non-matching key, Then returns false', () => {
      expect(
        keyMatchesRule('a', [{ key: 'b' }], new Map()),
      ).toBe(false);
    });
  });

  describe('multiple rules', () => {
    test('Given multiple rules where one matches, Then returns true', () => {
      expect(
        keyMatchesRule('b', [{ key: 'a' }, { key: 'b' }, { key: 'c' }], new Map()),
      ).toBe(true);
    });

    test('Given multiple rules where none match, Then returns false', () => {
      expect(
        keyMatchesRule('d', [{ key: 'a' }, { key: 'b' }], new Map()),
      ).toBe(false);
    });
  });

  describe('when condition', () => {
    test('Given a matching key but when function returns false, Then returns false', () => {
      expect(
        keyMatchesRule('a', [{ key: 'a', when: () => false }], new Map()),
      ).toBe(false);
    });

    test('Given two matching rules, first when=false second when unset, Then returns true', () => {
      expect(
        keyMatchesRule('a', [
          { key: 'a', when: () => false },
          { key: 'a' },
        ], new Map()),
      ).toBe(true);
    });

    test('Given matching key with when referencing a registered condition, Then returns true', () => {
      const conditions = new Map([['active', true]]);
      expect(
        keyMatchesRule('a', [{ key: 'a', when: 'active' }], conditions),
      ).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('Given empty rules array, Then returns false', () => {
      expect(keyMatchesRule('a', [], new Map())).toBe(false);
    });

    test('Given all matching rules have when=false, Then returns false', () => {
      expect(
        keyMatchesRule('a', [
          { key: 'a', when: () => false },
          { key: 'a', when: () => false },
        ], new Map()),
      ).toBe(false);
    });
  });
});
