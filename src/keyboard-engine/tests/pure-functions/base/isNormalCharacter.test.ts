import { describe, test, expect } from 'vitest';
import { isNormalCharacter } from '../../../src/isNormalCharacter.js';

function key(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    tab: false,
    backspace: false,
    delete: false,
    ctrl: false,
    meta: false,
    super: false,
    hyper: false,
    ...overrides,
  };
}

function isSpecialKey(k: unknown): boolean {
  const r = k as Record<string, unknown>;
  if (r.upArrow || r.downArrow || r.leftArrow || r.rightArrow) return true;
  if (r.pageDown || r.pageUp || r.home || r.end) return true;
  if (r.return || r.escape || r.tab || r.backspace || r.delete) return true;
  if (r.ctrl || r.meta || r.super || r.hyper) return true;
  if (r.eventType === 'release') return true;
  return false;
}

describe('isNormalCharacter', () => {
  describe('basic scenarios', () => {
    test('Given a normal character input and plain key, When called, Then returns true', () => {
      expect(isNormalCharacter('a', key(), isSpecialKey)).toBe(true);
    });

    test('Given a digit input, Then returns true', () => {
      expect(isNormalCharacter('1', key(), isSpecialKey)).toBe(true);
    });

    test('Given an uppercase letter input, Then returns true', () => {
      expect(isNormalCharacter('A', key(), isSpecialKey)).toBe(true);
    });

    test('Given a punctuation input, Then returns true', () => {
      expect(isNormalCharacter('!', key(), isSpecialKey)).toBe(true);
    });
  });

  describe('empty input', () => {
    test('Given empty string input, Then returns false', () => {
      expect(isNormalCharacter('', key(), isSpecialKey)).toBe(false);
    });
  });

  describe('arrow keys', () => {
    test('Given upArrow=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ upArrow: true }), isSpecialKey)).toBe(false);
    });

    test('Given downArrow=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ downArrow: true }), isSpecialKey)).toBe(false);
    });

    test('Given leftArrow=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ leftArrow: true }), isSpecialKey)).toBe(false);
    });

    test('Given rightArrow=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ rightArrow: true }), isSpecialKey)).toBe(false);
    });
  });

  describe('navigation keys', () => {
    test('Given pageDown=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ pageDown: true }), isSpecialKey)).toBe(false);
    });

    test('Given pageUp=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ pageUp: true }), isSpecialKey)).toBe(false);
    });

    test('Given home=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ home: true }), isSpecialKey)).toBe(false);
    });

    test('Given end=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ end: true }), isSpecialKey)).toBe(false);
    });
  });

  describe('special function keys', () => {
    test('Given return=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ return: true }), isSpecialKey)).toBe(false);
    });

    test('Given escape=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ escape: true }), isSpecialKey)).toBe(false);
    });

    test('Given tab=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ tab: true }), isSpecialKey)).toBe(false);
    });

    test('Given backspace=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ backspace: true }), isSpecialKey)).toBe(false);
    });

    test('Given delete=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ delete: true }), isSpecialKey)).toBe(false);
    });
  });

  describe('modifier keys', () => {
    test('Given ctrl=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ ctrl: true }), isSpecialKey)).toBe(false);
    });

    test('Given meta=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ meta: true }), isSpecialKey)).toBe(false);
    });

    test('Given super=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ super: true }), isSpecialKey)).toBe(false);
    });

    test('Given hyper=true, Then returns false', () => {
      expect(isNormalCharacter('a', key({ hyper: true }), isSpecialKey)).toBe(false);
    });
  });

  describe('release events', () => {
    test('Given eventType="release", Then returns false', () => {
      expect(
        isNormalCharacter('a', key({ eventType: 'release' }), isSpecialKey),
      ).toBe(false);
    });
  });

  describe('combined scenarios', () => {
    test('Given ctrl=true with non-empty input, Then still returns false (modifier takes priority)', () => {
      expect(isNormalCharacter('c', key({ ctrl: true }), isSpecialKey)).toBe(false);
    });

    test('Given empty input with all key props false, Then returns false (input check first)', () => {
      expect(isNormalCharacter('', key(), isSpecialKey)).toBe(false);
    });
  });
});
