import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('BindingService — boundKeyboard', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  describe('overload 1: keys + handler', () => {
    test('Given keys array and handler, Then handler fires on matching key', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard(['a'], handler);
      engine.processKey('a', {});
      expect(handler).toHaveBeenCalledWith('a', {});
    });

    test('Given single string key and handler, Then handler fires', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler);
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledWith('x', {});
    });

    test('Given key not matching, Then handler is not called', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard(['a'], handler);
      engine.processKey('b', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('overload 2: keys + actionId', () => {
    test('Given keys and actionId referencing a registered action, Then action fires', () => {
      const engine = createEngine();
      setup(engine);
      const action = vi.fn();
      engine.defineShortcutAction([{ actionId: 'myAction', action }]);
      engine.boundKeyboard(['a'], 'myAction');
      engine.processKey('a', {});
      expect(action).toHaveBeenCalled();
    });

    test('Given unregistered actionId, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      expect(() => engine.boundKeyboard(['a'], 'nonexistent')).toThrow(
        /does not exist/,
      );
    });
  });

  describe('overload 3: actionId with preset keys', () => {
    test('Given actionId referencing an action with preset keys, Then binding uses preset keys', () => {
      const engine = createEngine();
      setup(engine);
      const action = vi.fn();
      engine.defineShortcutAction([{ actionId: 'myAction', action, keys: ['ctrl+s'] }]);
      engine.boundKeyboard('myAction', {});
      engine.processKey('ctrl+s', {});
      expect(action).toHaveBeenCalled();
    });

    test('Given actionId without preset keys, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      engine.defineShortcutAction([{ actionId: 'myAction', action: () => {} }]);
      expect(() => engine.boundKeyboard('myAction', {})).toThrow(
        /does not have predefined keys/,
      );
    });
  });

  describe('unbind', () => {
    test('Given unbind function returned, calling it removes the binding', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      const unbind = engine.boundKeyboard('x', handler);
      unbind();
      engine.processKey('x', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('options', () => {
    test('Given focusId, Then binding is created on the focus target', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler, { focusId: 'input1' });
      expect(engine.focusCurrent().result?.id).toBe('input1');
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalled();
    });

    test('Given times=2, Then handler fires on every 2nd press', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler, { times: 2 });
      engine.processKey('x', {});
      expect(handler).not.toHaveBeenCalled();
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
    });

    test('Given times=3 with observer, Then observer receives remaining count', () => {
      const engine = createEngine();
      setup(engine);
      const observer = vi.fn();
      engine.boundKeyboard('x', () => {}, { times: 3, observer });
      engine.processKey('x', {});
      expect(observer).toHaveBeenCalledWith(2);
      engine.processKey('x', {});
      expect(observer).toHaveBeenCalledWith(1);
    });

    test('Given once=true, Then binding is removed after first invocation', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler, { once: true });
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
    });

    test('Given times=3 and once=true, Then handler fires on 3rd press and unbinds', () => {
      const engine = createEngine();
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler, { times: 3, once: true });
      engine.processKey('x', {});
      engine.processKey('x', {});
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
    });

    test('Given times < 1, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      expect(() => engine.boundKeyboard('x', () => {}, { times: 0 })).toThrow(
        /times.*must be >= 1/,
      );
    });

    test('Given observer without times, Then throws', () => {
      const engine = createEngine();
      setup(engine);
      expect(() =>
        engine.boundKeyboard('x', () => {}, { observer: () => {} }),
      ).toThrow(/observer.*requires times/);
    });

    test('Given mode option, Then binding only fires in that mode', () => {
      const engine = createEngine(['normal', 'insert'], 'normal');
      setup(engine);
      const handler = vi.fn();
      engine.boundKeyboard('x', handler, { mode: 'insert' });
      engine.processKey('x', {});
      expect(handler).not.toHaveBeenCalled();
      engine.setMode('insert');
      engine.processKey('x', {});
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('globalKeyOverrides', () => {
    test('Given overlay binds key matching affectOverlay=true global key, Then override is created', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.globalKeys([{ key: 'x', operate: () => {}, affectOverlay: true }]);
      engine.pushOwner('ov1');
      engine.boundKeyboard(['x'], () => {});
      engine.popOwner('ov1');
      const layer = engine.readLayer('ov1')!;
      expect(layer.globalKeyOverrides.has('x')).toBe(true);
    });

    test('Given overlay binds key with affectOverlay=true cover=false global key, Then throws', () => {
      const engine = createEngine();
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: ['ov1'],
        displayedOverlays: [{ id: 'ov1' }],
        activeModalId: null,
        displayedModals: [],
      });
      engine.globalKeys([{ key: 'x', operate: () => {}, affectOverlay: true, cover: false }]);
      engine.pushOwner('ov1');
      expect(() => engine.boundKeyboard(['x'], () => {})).toThrow(
        /cover: false.*overriding is not allowed/,
      );
      engine.popOwner('ov1');
    });
  });
});
