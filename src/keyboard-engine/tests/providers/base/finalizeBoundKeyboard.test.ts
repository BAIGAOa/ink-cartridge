import { describe, test, expect, vi } from 'vitest';
import { finalizeBoundKeyboard } from '../../../src/providers/helpers.js';
import { fakeLayer, makeEntry } from '../../_helpers/factories.js';

describe('finalizeBoundKeyboard', () => {
  test('Given handler is a string actionId, Then actionKeysMap is populated', () => {
    const bindings: any[] = [];
    const actionKeysMap = new Map<string, string[]>();
    const layer = fakeLayer();
    const entry = makeEntry(['x', 'y']);
    bindings.push(entry);

    const unbind = finalizeBoundKeyboard(
      bindings, actionKeysMap, layer, entry, 'myAction', ['x', 'y'],
    );

    expect(actionKeysMap.get('myAction')).toEqual(['x', 'y']);
    // Calling unbind cleans up
    unbind();
    expect(actionKeysMap.has('myAction')).toBe(false);
    expect(bindings).toHaveLength(0);
  });

  test('Given handler is a function, Then actionKeysMap is not populated', () => {
    const bindings: any[] = [];
    const actionKeysMap = new Map<string, string[]>();
    const layer = fakeLayer();
    const entry = makeEntry(['x']);
    const handler = vi.fn();
    bindings.push(entry);

    finalizeBoundKeyboard(bindings, actionKeysMap, layer, entry, handler, ['x']);
    expect(actionKeysMap.size).toBe(0);
  });

  test('Given unbind, Then binding is removed from array and globalKeyOverrides cleaned', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    layer.globalKeyOverrides.add('x');
    const entry = makeEntry(['x']);
    bindings.push(entry);

    const unbind = finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, () => {}, ['x'],
    );
    unbind();
    expect(bindings).toHaveLength(0);
    expect(layer.globalKeyOverrides.has('x')).toBe(false);
  });

  test('Given once=true, Then handler fires once and binding is auto-removed', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    const handler = vi.fn();
    const entry = makeEntry(['x'], handler);
    bindings.push(entry);

    finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, handler, ['x'], { once: true },
    );
    // The handler should be wrapped; calling it unbinds first, then calls original
    entry.handler('x', {});
    expect(handler).toHaveBeenCalledOnce();
    expect(bindings).toHaveLength(0);
  });

  test('Given times=3, Then handler fires on every 3rd press', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    const handler = vi.fn();
    const entry = makeEntry(['x'], handler);
    bindings.push(entry);

    finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, handler, ['x'], { times: 3 },
    );
    // Press 1
    entry.handler('x', {});
    expect(handler).not.toHaveBeenCalled();
    // Press 2
    entry.handler('x', {});
    expect(handler).not.toHaveBeenCalled();
    // Press 3 — fires
    entry.handler('x', {});
    expect(handler).toHaveBeenCalledOnce();
    // Press 4 — counter reset, no fire
    entry.handler('x', {});
    expect(handler).toHaveBeenCalledOnce();
  });

  test('Given times=3 and once=true, Then handler fires on 3rd press and unbinds', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    const handler = vi.fn();
    const entry = makeEntry(['x'], handler);
    bindings.push(entry);

    finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, handler, ['x'], { times: 3, once: true },
    );
    entry.handler('x', {}); // 1
    entry.handler('x', {}); // 2
    entry.handler('x', {}); // 3 — fires + unbinds
    expect(handler).toHaveBeenCalledOnce();
    expect(bindings).toHaveLength(0);
  });

  test('Given times=2 with observer, Then observer is called with remaining count', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    const observer = vi.fn();
    const entry = makeEntry(['x']);
    bindings.push(entry);

    finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, () => {}, ['x'], { times: 2, observer },
    );
    entry.handler('x', {}); // remaining: 1
    expect(observer).toHaveBeenCalledWith(1);
  });

  test('Given handler throws, once=true still unbinds before handler execution', () => {
    const bindings: any[] = [];
    const layer = fakeLayer();
    const entry = makeEntry(['x'], () => {
      throw new Error('handler error');
    });
    bindings.push(entry);

    finalizeBoundKeyboard(
      bindings, new Map(), layer, entry, entry.handler, ['x'], { once: true },
    );
    expect(() => entry.handler('x', {})).toThrow('handler error');
    // Binding should be removed even though handler threw
    expect(bindings).toHaveLength(0);
  });
});
