import { describe, test, expect } from 'vitest';
import { checkWhen } from '../../../src/checkWhen.js';

describe('checkWhen', () => {
  describe('basic scenarios', () => {
    test('Given when is undefined, Then returns true', () => {
      expect(checkWhen(undefined, new Map())).toBe(true);
    });

    test('Given when is a function returning true, Then returns true', () => {
      expect(checkWhen(() => true, new Map())).toBe(true);
    });

    test('Given when is a function returning false, Then returns false', () => {
      expect(checkWhen(() => false, new Map())).toBe(false);
    });
  });

  describe('string condition reference', () => {
    test('Given when references a registered condition id with value true, Then returns true', () => {
      const conditions = new Map<string, boolean>([['editing', true]]);
      expect(checkWhen('editing', conditions)).toBe(true);
    });

    test('Given when references a registered condition id with value false, Then returns false', () => {
      const conditions = new Map<string, boolean>([['editing', false]]);
      expect(checkWhen('editing', conditions)).toBe(false);
    });
  });

  describe('error paths', () => {
    test('Given when is an unregistered string condition id, Then throws', () => {
      expect(() => checkWhen('unknown', new Map())).toThrow(
        '[ink-cartridge] Condition "unknown" is not registered.',
      );
    });
  });
});
