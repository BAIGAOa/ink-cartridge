import { describe, test, expect, vi } from 'vitest';
import {
  pushKeyEntries,
  setIfAbsent,
  deleteIfPresent,
  modifyEntryKeys,
  cleanupGlobalKeyOverrides,
  removeKeysFromActionMap,
  clearShortcutOperations,
} from '../../../src/providers/helpers.js';
import type { KeyRuleContainer } from '../../../src/providers/helpers.js';

describe('pushKeyEntries', () => {
  function makeContainer(): KeyRuleContainer {
    return { allowedKeys: [], penetrationKeys: [], stoppedKeys: [] };
  }

  test('Given new keys, Then they are pushed to the target array', () => {
    const c = makeContainer();
    pushKeyEntries(c, 'allowedKeys', ['a', 'b'], (k) => ({ key: k }));
    expect(c.allowedKeys).toHaveLength(2);
    expect(c.allowedKeys[0].key).toBe('a');
  });

  test('Given duplicate key, Then it is not pushed again', () => {
    const c = makeContainer();
    pushKeyEntries(c, 'stoppedKeys', ['x'], (k) => ({ key: k }));
    pushKeyEntries(c, 'stoppedKeys', ['x'], (k) => ({ key: k }));
    expect(c.stoppedKeys).toHaveLength(1);
  });

  test('Given cleanup function, Then only the added keys are removed', () => {
    const c = makeContainer();
    c.penetrationKeys = [{ key: 'existing' }];
    const cleanup = pushKeyEntries(c, 'penetrationKeys', ['a'], (k) => ({ key: k }));
    expect(c.penetrationKeys).toHaveLength(2);
    cleanup();
    expect(c.penetrationKeys).toHaveLength(1);
    expect(c.penetrationKeys[0].key).toBe('existing');
  });
});

describe('setIfAbsent', () => {
  test('Given new id, Then value is inserted', () => {
    const map = new Map<string, { action: () => void }>();
    setIfAbsent(map, 'a', { action: () => {} }, 'duplicate');
    expect(map.has('a')).toBe(true);
  });

  test('Given duplicate id, Then throws', () => {
    const map = new Map([['a', { action: () => {} }]]);
    expect(() => setIfAbsent(map, 'a', { action: () => {} }, 'already exists')).toThrow(
      'already exists',
    );
  });
});

describe('deleteIfPresent', () => {
  test('Given existing id, Then deletes it', () => {
    const map = new Map([['a', 'value']]);
    deleteIfPresent(map, 'a', 'not found');
    expect(map.has('a')).toBe(false);
  });

  test('Given non-existent id, Then throws', () => {
    const map = new Map();
    expect(() => deleteIfPresent(map, 'a', 'not found')).toThrow('not found');
  });
});

describe('modifyEntryKeys', () => {
  test('Given existing entry with keys, Then keys are updated', () => {
    const map = new Map([['a', { keys: ['x'] }]]);
    const entry = modifyEntryKeys(map, 'a', ['y'], 'not found', 'no keys');
    expect(entry.keys).toEqual(['y']);
  });

  test('Given non-existent id, Then throws', () => {
    const map = new Map();
    expect(() => modifyEntryKeys(map, 'a', ['y'], 'not found', 'no keys')).toThrow(
      'not found',
    );
  });

  test('Given entry without keys, Then throws', () => {
    const map = new Map([['a', {}]]);
    expect(() => modifyEntryKeys(map, 'a', ['y'], 'not found', 'no keys')).toThrow(
      'no keys',
    );
  });
});

describe('cleanupGlobalKeyOverrides', () => {
  test('Given overrides no longer referenced by any binding, Then they are cleaned up', () => {
    const layer = {
      bindings: [],
      focusTargets: new Map(),
      globalKeyOverrides: new Set(['x']),
    } as any;
    cleanupGlobalKeyOverrides(layer, ['x']);
    expect(layer.globalKeyOverrides.has('x')).toBe(false);
  });

  test('Given override still referenced by a layer binding, Then it is kept', () => {
    const layer = {
      bindings: [{ keys: ['x'] }],
      focusTargets: new Map(),
      globalKeyOverrides: new Set(['x']),
    } as any;
    cleanupGlobalKeyOverrides(layer, ['x']);
    expect(layer.globalKeyOverrides.has('x')).toBe(true);
  });
});

describe('removeKeysFromActionMap', () => {
  test('Given partial key removal, Then only removed keys are deleted from the entry', () => {
    const map = new Map([['act', ['a', 'b', 'c']]]);
    removeKeysFromActionMap(map, 'act', ['b']);
    expect(map.get('act')).toEqual(['a', 'c']);
  });

  test('Given all keys removed, Then the entire entry is deleted', () => {
    const map = new Map([['act', ['a']]]);
    removeKeysFromActionMap(map, 'act', ['a']);
    expect(map.has('act')).toBe(false);
  });

  test('Given action not in map, Then returns without error', () => {
    const map = new Map();
    removeKeysFromActionMap(map, 'nonexistent', ['a']);
    // no throw
  });
});

describe('clearShortcutOperations', () => {
  test('Given a call to clearShortcutOperations, Then it is a no-op (deprecated)', () => {
    // This function is now a no-op — state is per-instance
    clearShortcutOperations();
  });
});
