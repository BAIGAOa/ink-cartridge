import { describe, test, expect, vi } from 'vitest';
import { tryMatchBindings } from '../../../src/layerHandler.js';
import { makeEntry } from '../../_helpers/factories.js';

const notSpecial = (_key: unknown): boolean => false;

describe('tryMatchBindings', () => {
  describe('basic scenarios', () => {
    test('Given availableKeys is empty, Then returns false', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler)];
      expect(
        tryMatchBindings(bindings, null, [], '', {}, new Map(), notSpecial),
      ).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('Given an exact key match, Then calls handler and returns true', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(true);
      expect(handler).toHaveBeenCalledWith('a', {});
    });

    test('Given no binding matches availableKeys, Then returns false', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['b'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(false);
    });
  });

  describe('mode filtering', () => {
    test('Given binding.mode matches currentMode, Then fires', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler, { mode: 'insert' })];
      expect(
        tryMatchBindings(bindings, 'insert', ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(true);
    });

    test('Given binding.mode does not match currentMode, Then skips', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler, { mode: 'insert' })];
      expect(
        tryMatchBindings(bindings, 'normal', ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(false);
    });
  });

  describe('when condition', () => {
    test('Given binding.when returns false, Then skips', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler, { when: () => false })];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(false);
    });

    test('Given binding.when returns true, Then fires', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler, { when: () => true })];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(true);
    });

    test('Given binding.when references a condition id with value false, Then skips', () => {
      const handler = vi.fn();
      const conditions = new Map([['editing', false]]);
      const bindings = [makeEntry(['a'], handler, { when: 'editing' })];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, conditions, notSpecial),
      ).toBe(false);
    });
  });

  describe('skipBinding', () => {
    test('Given skipBinding returns true, Then skips the binding', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial, () => true),
      ).toBe(false);
    });

    test('Given skipBinding returns false, Then continues matching', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['a'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial, () => false),
      ).toBe(true);
    });
  });

  describe('wildcard *', () => {
    test('Given exact match fails but * binding exists with normal char, Then fires *', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['*'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(true);
      expect(handler).toHaveBeenCalledWith('a', {});
    });

    test('Given * binding but input is not a normal character (empty), Then does not fire', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['*'], handler)];
      expect(
        tryMatchBindings(bindings, null, [''], '', {}, new Map(), notSpecial),
      ).toBe(false);
    });

    test('Given * binding but skipBinding returns true, Then does not fire', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['*'], handler)];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial, () => true),
      ).toBe(false);
    });
  });

  describe('match priority', () => {
    test('Given both exact match and * binding exist, exact match fires first', () => {
      const exactHandler = vi.fn();
      const wildcardHandler = vi.fn();
      const bindings = [
        makeEntry(['a'], exactHandler),
        makeEntry(['*'], wildcardHandler),
      ];
      tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial);
      expect(exactHandler).toHaveBeenCalledOnce();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });
  });

  describe('short-circuit evaluation order', () => {
    test('Given mode does not match, subsequent when/keys are not checked', () => {
      const handler = vi.fn();
      const when = vi.fn(() => true);
      const bindings = [makeEntry(['a'], handler, { mode: 'insert', when })];
      tryMatchBindings(bindings, 'normal', ['a'], 'a', {}, new Map(), notSpecial);
      expect(when).not.toHaveBeenCalled();
    });

    test('Given when returns false, keys are not checked', () => {
      const handler = vi.fn();
      const bindings = [makeEntry(['nonexistent'], handler, { when: () => false })];
      expect(
        tryMatchBindings(bindings, null, ['a'], 'a', {}, new Map(), notSpecial),
      ).toBe(false);
    });
  });
});
