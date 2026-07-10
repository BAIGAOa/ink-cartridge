import { describe, test, expect } from 'vitest';
import { checkGlobalKey } from '../../../src/checkGlobalKey.js';
import type { GlobalKeyEntry } from '../../../src/types.js';

function makeEntry(overrides: Partial<GlobalKeyEntry> = {}): GlobalKeyEntry {
  return { key: 'x', operate: () => {}, ...overrides };
}

describe('checkGlobalKey', () => {
  const dummyComponent = { name: 'TestScreen' };
  const layersRef = { current: new Map() };

  describe('key name matching', () => {
    test('Given eventNames does not include entry.key, Then returns false', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'y' }), ['x'], dummyComponent, layersRef),
      ).toBe(false);
    });

    test('Given eventNames includes entry.key (string), Then returns true', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], dummyComponent, layersRef),
      ).toBe(true);
    });

    test('Given eventNames includes one key from entry.key array, Then returns true', () => {
      expect(
        checkGlobalKey(makeEntry({ key: ['a', 'b'] }), ['b'], dummyComponent, layersRef),
      ).toBe(true);
    });

    test('Given eventNames includes none of entry.key array, Then returns false', () => {
      expect(
        checkGlobalKey(makeEntry({ key: ['a', 'b'] }), ['c', 'd'], dummyComponent, layersRef),
      ).toBe(false);
    });
  });

  describe('topComponent', () => {
    test('Given topComponent is null, Then returns false', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], null, layersRef),
      ).toBe(false);
    });
  });

  describe('category whitelist', () => {
    test('Given category is undefined, Then passes (matches all)', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], dummyComponent, layersRef),
      ).toBe(true);
    });

    test('Given category="*", Then passes', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x', category: '*' }), ['x'], dummyComponent, layersRef),
      ).toBe(true);
    });

    test('Given category=[] (empty array), Then returns false', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x', category: [] }), ['x'], dummyComponent, layersRef),
      ).toBe(false);
    });

    test('Given category array includes topComponent, Then passes', () => {
      expect(
        checkGlobalKey(
          makeEntry({ key: 'x', category: [dummyComponent] }),
          ['x'], dummyComponent, layersRef,
        ),
      ).toBe(true);
    });

    test('Given category array does not include topComponent, Then returns false', () => {
      const other = { name: 'OtherScreen' };
      expect(
        checkGlobalKey(
          makeEntry({ key: 'x', category: [other] }),
          ['x'], dummyComponent, layersRef,
        ),
      ).toBe(false);
    });
  });

  describe('cover + globalKeyOverrides', () => {
    test('Given cover=true (default) and layer has override, Then returns false', () => {
      const ref = { current: new Map() };
      ref.current.set(dummyComponent, {
        globalKeyOverrides: new Set(['x']),
      } as any);

      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], dummyComponent, ref),
      ).toBe(false);
    });

    test('Given cover=false and layer has override, Then still returns true', () => {
      const ref = { current: new Map() };
      ref.current.set(dummyComponent, {
        globalKeyOverrides: new Set(['x']),
      } as any);

      expect(
        checkGlobalKey(makeEntry({ key: 'x', cover: false }), ['x'], dummyComponent, ref),
      ).toBe(true);
    });

    test('Given affectOverlay=true, Then skips cover check entirely', () => {
      const ref = { current: new Map() };
      ref.current.set(dummyComponent, {
        globalKeyOverrides: new Set(['x']),
      } as any);

      expect(
        checkGlobalKey(makeEntry({ key: 'x', affectOverlay: true }), ['x'], dummyComponent, ref),
      ).toBe(true);
    });

    test('Given layer does not exist in layersRef, Then cover check passes', () => {
      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], dummyComponent, layersRef),
      ).toBe(true);
    });

    test('Given layer exists but globalKeyOverrides does not contain the key, Then passes', () => {
      const ref = { current: new Map() };
      ref.current.set(dummyComponent, {
        globalKeyOverrides: new Set(['y']),
      } as any);

      expect(
        checkGlobalKey(makeEntry({ key: 'x' }), ['x'], dummyComponent, ref),
      ).toBe(true);
    });
  });
});
