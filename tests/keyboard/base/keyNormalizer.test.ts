import { describe, it, expect } from 'vitest';
import { normalizeKeyNames } from '../../../src/keyboard/keyNormalizer.js';
import { isNormalCharacter } from '../../../src/keyboard/index.js';
import type { Key } from 'ink';

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    return: false,
    escape: false,
    tab: false,
    backspace: false,
    delete: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    ctrl: false,
    shift: false,
    meta: false,
    super: false,
    hyper: false,
    capsLock: false,
    eventType: 'press' as const,
    ...overrides,
  } as Key;
}

describe('normalizeKeyNames', () => {
  describe('special keys', () => {
    it('maps return key', () => {
      expect(normalizeKeyNames('', makeKey({ return: true }))).toEqual(['return']);
    });

    it('maps escape key', () => {
      expect(normalizeKeyNames('', makeKey({ escape: true }))).toEqual(['escape']);
    });

    it('maps backspace key', () => {
      expect(normalizeKeyNames('', makeKey({ backspace: true }))).toEqual(['backspace']);
    });

    it('maps delete key', () => {
      expect(normalizeKeyNames('', makeKey({ delete: true }))).toEqual(['delete']);
    });

    it('maps up arrow', () => {
      expect(normalizeKeyNames('', makeKey({ upArrow: true }))).toEqual(['up']);
    });

    it('maps down arrow', () => {
      expect(normalizeKeyNames('', makeKey({ downArrow: true }))).toEqual(['down']);
    });

    it('maps left arrow', () => {
      expect(normalizeKeyNames('', makeKey({ leftArrow: true }))).toEqual(['left']);
    });

    it('maps right arrow', () => {
      expect(normalizeKeyNames('', makeKey({ rightArrow: true }))).toEqual(['right']);
    });

    it('maps tab key', () => {
      expect(normalizeKeyNames('', makeKey({ tab: true }))).toEqual(['tab']);
    });

    it('maps pageDown', () => {
      expect(normalizeKeyNames('', makeKey({ pageDown: true }))).toEqual(['pagedown']);
    });

    it('maps pageUp', () => {
      expect(normalizeKeyNames('', makeKey({ pageUp: true }))).toEqual(['pageup']);
    });

    it('maps home', () => {
      expect(normalizeKeyNames('', makeKey({ home: true }))).toEqual(['home']);
    });

    it('maps end', () => {
      expect(normalizeKeyNames('', makeKey({ end: true }))).toEqual(['end']);
    });
  });

  describe('modifier keys with special keys', () => {
    it('adds ctrl prefix for special key', () => {
      const result = normalizeKeyNames('', makeKey({ return: true, ctrl: true }));
      expect(result).toContain('return');
      expect(result).toContain('ctrl+return');
    });

    it('adds shift prefix for special key', () => {
      const result = normalizeKeyNames('', makeKey({ return: true, shift: true }));
      expect(result).toContain('return');
      expect(result).toContain('shift+return');
    });

    it('adds meta prefix for special key', () => {
      const result = normalizeKeyNames('', makeKey({ return: true, meta: true }));
      expect(result).toContain('return');
      expect(result).toContain('meta+return');
    });

    it('adds ctrl+shift prefix for special key', () => {
      const result = normalizeKeyNames('', makeKey({ return: true, ctrl: true, shift: true }));
      expect(result).toContain('return');
      expect(result).toContain('ctrl+return');
      expect(result).toContain('shift+return');
      expect(result).toContain('ctrl+shift+return');
    });
  });

  describe('character keys', () => {
    it('returns raw character', () => {
      expect(normalizeKeyNames('a', makeKey())).toEqual(['a']);
    });

    it('adds ctrl prefix for character', () => {
      const result = normalizeKeyNames('s', makeKey({ ctrl: true }));
      expect(result).toContain('s');
      expect(result).toContain('ctrl+s');
    });

    it('adds shift prefix for character', () => {
      const result = normalizeKeyNames('A', makeKey({ shift: true }));
      expect(result).toContain('A');
      expect(result).toContain('shift+A');
    });

    it('adds meta prefix for character', () => {
      const result = normalizeKeyNames('x', makeKey({ meta: true }));
      expect(result).toContain('x');
      expect(result).toContain('meta+x');
    });

    it('adds ctrl+shift prefix for character', () => {
      const result = normalizeKeyNames('S', makeKey({ ctrl: true, shift: true }));
      expect(result).toContain('S');
      expect(result).toContain('ctrl+S');
      expect(result).toContain('shift+S');
      expect(result).toContain('ctrl+shift+S');
    });
  });

  describe('edge cases', () => {
    it('empty input with no special keys returns empty array', () => {
      expect(normalizeKeyNames('', makeKey())).toEqual([]);
    });

    it('special keys take priority over character input', () => {
      // When a special key is pressed, input is empty, but even if it had
      // content, special keys are checked first and return early
      const result = normalizeKeyNames('', makeKey({ return: true }));
      expect(result).toEqual(['return']);
    });
  });
});

describe('isNormalCharacter', () => {
  it('returns true for regular character input', () => {
    expect(isNormalCharacter('a', makeKey())).toBe(true);
  });

  it('returns false for empty input', () => {
    expect(isNormalCharacter('', makeKey())).toBe(false);
  });

  it('returns false when upArrow is true', () => {
    expect(isNormalCharacter('a', makeKey({ upArrow: true }))).toBe(false);
  });

  it('returns false when downArrow is true', () => {
    expect(isNormalCharacter('a', makeKey({ downArrow: true }))).toBe(false);
  });

  it('returns false when leftArrow is true', () => {
    expect(isNormalCharacter('a', makeKey({ leftArrow: true }))).toBe(false);
  });

  it('returns false when rightArrow is true', () => {
    expect(isNormalCharacter('a', makeKey({ rightArrow: true }))).toBe(false);
  });

  it('returns false when pageDown is true', () => {
    expect(isNormalCharacter('a', makeKey({ pageDown: true }))).toBe(false);
  });

  it('returns false when pageUp is true', () => {
    expect(isNormalCharacter('a', makeKey({ pageUp: true }))).toBe(false);
  });

  it('returns false when home is true', () => {
    expect(isNormalCharacter('a', makeKey({ home: true }))).toBe(false);
  });

  it('returns false when end is true', () => {
    expect(isNormalCharacter('a', makeKey({ end: true }))).toBe(false);
  });

  it('returns false when return is true', () => {
    expect(isNormalCharacter('a', makeKey({ return: true }))).toBe(false);
  });

  it('returns false when escape is true', () => {
    expect(isNormalCharacter('a', makeKey({ escape: true }))).toBe(false);
  });

  it('returns false when tab is true', () => {
    expect(isNormalCharacter('a', makeKey({ tab: true }))).toBe(false);
  });

  it('returns false when backspace is true', () => {
    expect(isNormalCharacter('a', makeKey({ backspace: true }))).toBe(false);
  });

  it('returns false when delete is true', () => {
    expect(isNormalCharacter('a', makeKey({ delete: true }))).toBe(false);
  });

  it('returns false when ctrl is true', () => {
    expect(isNormalCharacter('a', makeKey({ ctrl: true }))).toBe(false);
  });

  it('returns false when meta is true', () => {
    expect(isNormalCharacter('a', makeKey({ meta: true }))).toBe(false);
  });

  it('returns false when super is true', () => {
    expect(isNormalCharacter('a', makeKey({ super: true }))).toBe(false);
  });

  it('returns false when hyper is true', () => {
    expect(isNormalCharacter('a', makeKey({ hyper: true }))).toBe(false);
  });

  it('returns false for release events', () => {
    expect(isNormalCharacter('a', makeKey({ eventType: 'release' }))).toBe(false);
  });
});
