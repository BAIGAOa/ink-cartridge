import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('OperationRegistry — globalKeys', () => {
  describe('basic registration', () => {
    test('Given globalKeys with entries, Then getGlobalKeys returns them', () => {
      const engine = createEngine();
      const operate = vi.fn();
      engine.globalKeys([{ key: 'x', operate }]);
      const keys = engine.getGlobalKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0].key).toBe('x');
    });

    test('Given globalKeys with string key array, Then entry is registered', () => {
      const engine = createEngine();
      engine.globalKeys([{ key: ['a', 'b'], operate: () => {} }]);
      expect(engine.getGlobalKeys()[0].key).toEqual(['a', 'b']);
    });
  });

  describe('replace vs add mode', () => {
    test('Given default (replace) mode, Then second call replaces all entries', () => {
      const engine = createEngine();
      engine.globalKeys([{ key: 'x', operate: () => {} }]);
      engine.globalKeys([{ key: 'y', operate: () => {} }]);
      expect(engine.getGlobalKeys()).toHaveLength(1);
      expect(engine.getGlobalKeys()[0].key).toBe('y');
    });

    test('Given add mode, Then second call appends without removing existing', () => {
      const engine = createEngine();
      engine.globalKeys([{ key: 'x', operate: () => {} }]);
      engine.globalKeys([{ key: 'y', operate: () => {} }], { mode: 'add' });
      expect(engine.getGlobalKeys()).toHaveLength(2);
    });
  });

  describe('string operate resolution', () => {
    test('Given operate is a string referencing a registered shortcut action, Then it resolves', () => {
      const engine = createEngine();
      const action = vi.fn();
      engine.defineShortcutAction([{ actionId: 'myAction', action }]);
      engine.globalKeys([{ key: 'x', operate: 'myAction' }]);
      const keys = engine.getGlobalKeys();
      expect(keys[0].operate).toBe(action);
    });

    test('Given operate is a string referencing an unregistered action, Then throws', () => {
      const engine = createEngine();
      expect(() =>
        engine.globalKeys([{ key: 'x', operate: 'unregistered' }]),
      ).toThrow(/not registered/);
    });
  });

  describe('times validation', () => {
    test('Given times < 1, Then throws', () => {
      const engine = createEngine();
      expect(() =>
        engine.globalKeys([{ key: 'x', operate: () => {}, times: 0 }]),
      ).toThrow(/times.*at least 1|times.*must be >= 1/);
    });

    test('Given observer without times, Then throws', () => {
      const engine = createEngine();
      expect(() =>
        engine.globalKeys([{ key: 'x', operate: () => {}, observer: () => {} }]),
      ).toThrow(/observer.*requires times/);
    });

    test('Given times >= 1, pressCount is initialized to 0', () => {
      const engine = createEngine();
      engine.globalKeys([{ key: 'x', operate: () => {}, times: 3 }]);
      expect(engine.getGlobalKeys()[0].pressCount).toBe(0);
    });
  });

  describe('mode filtering on entries', () => {
    test('Given entry with mode set, Then mode is preserved in resolved entry', () => {
      const engine = createEngine();
      engine.globalKeys([{ key: 'x', operate: () => {}, mode: 'insert' }]);
      expect(engine.getGlobalKeys()[0].mode).toBe('insert');
    });
  });
});
