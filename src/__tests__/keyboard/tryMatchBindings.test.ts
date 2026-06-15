import { describe, it, expect, vi } from 'vitest';
import type { Key } from 'ink';
import type { BoundKeyEntry } from '../../keyboard/types.js';
import { tryMatchBindings } from '../../keyboard/layer-handler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    return: false, escape: false, backspace: false, delete: false,
    tab: false, pageDown: false, pageUp: false,
    home: false, end: false, insert: false, numLock: false,
    ctrl: false, shift: false, meta: false,
    ...overrides,
  } as Key;
}

function makeEntry(overrides: Partial<BoundKeyEntry> = {}): BoundKeyEntry {
  return {
    keys: ['enter'],
    handler: vi.fn(),
    onlyThis: false,
    owner: 'test',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tryMatchBindings with when', () => {
  it('fires handler when when() returns true', () => {
    const handler = vi.fn();
    const entry = makeEntry({ keys: ['enter'], handler, when: () => true });
    const result = tryMatchBindings([entry], ['enter'], '', makeKey({ return: true }));

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips binding when when() returns false — tries next binding', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const entry1 = makeEntry({ keys: ['enter'], handler: handler1, when: () => false });
    const entry2 = makeEntry({ keys: ['enter'], handler: handler2 });

    const result = tryMatchBindings(
      [entry1, entry2],
      ['enter'],
      '',
      makeKey({ return: true }),
    );

    expect(result).toBe(true);
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('skips wildcard binding when when() returns false', () => {
    const handler = vi.fn();
    const entry = makeEntry({ keys: ['*'], handler, when: () => false });

    const result = tryMatchBindings(
      [entry],
      ['x'],
      'x',
      makeKey(),
    );

    expect(result).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires wildcard binding when when() returns true', () => {
    const handler = vi.fn();
    const entry = makeEntry({ keys: ['*'], handler, when: () => true });

    const result = tryMatchBindings(
      [entry],
      ['x'],
      'x',
      makeKey(),
    );

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('lets exception from when() propagate', () => {
    const handler = vi.fn();
    const entry = makeEntry({
      keys: ['enter'],
      handler,
      when: () => { throw new Error('when exploded'); },
    });

    expect(() => {
      tryMatchBindings([entry], ['enter'], '', makeKey({ return: true }));
    }).toThrow('when exploded');

    expect(handler).not.toHaveBeenCalled();
  });

  it('returns false when no binding matches due to when() returning false for all', () => {
    const handler = vi.fn();
    const entry = makeEntry({ keys: ['enter'], handler, when: () => false });

    const result = tryMatchBindings([entry], ['enter'], '', makeKey({ return: true }));

    expect(result).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
