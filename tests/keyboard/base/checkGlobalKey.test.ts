import { describe, it, expect } from 'vitest';
import { checkGlobalKey } from '../../../src/keyboard/check-global-key.js';
import type { GlobalKeyEntry, ScreenKeyboardLayer } from '../../../src/keyboard/types.js';

function fakeLayer(overrides: Partial<ScreenKeyboardLayer> = {}): ScreenKeyboardLayer {
  return {
    kind: 'screen',
    focusTargets: new Map(),
    focusOrder: [],
    currentFocusId: null,
    bindings: [],
    stoppedKeys: [],
    penetrationKeys: [],
    actionKeysMap: new Map(),
    sequences: new Map(),
    pendingSequence: null,
    globalKeyOverrides: new Set(),
    ...overrides,
  } as ScreenKeyboardLayer;
}

function dummyComponent() {
  return null;
}
dummyComponent.displayName = 'TestComponent';

describe('checkGlobalKey', () => {
  const eventNames = ['x'];

  it('returns false when key does not match', () => {
    const entry: GlobalKeyEntry = { key: 'y', operate: () => {} };
    const layersRef = { current: new Map() };

    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(false);
  });

  it('returns false when topComponent is null', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {} };
    const layersRef = { current: new Map() };

    expect(checkGlobalKey(entry, eventNames, null, layersRef)).toBe(false);
  });

  it('returns false when category is empty array', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, category: [] };
    const layersRef = { current: new Map() };

    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(false);
  });

  it('returns true when category matches topComponent', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, category: [dummyComponent] };
    const layersRef = { current: new Map() };

    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(true);
  });

  it('returns false when affectOverlay=false and key is overridden by screen', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, affectOverlay: false };
    const layer = fakeLayer({ globalKeyOverrides: new Set(['x']) });
    const layersRef = { current: new Map([[dummyComponent, layer]]) };

    // affectOverlay=false + cover defaults to true → screen override applies
    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(false);
  });

  it('returns true when affectOverlay=false and key is NOT overridden', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, affectOverlay: false };
    const layer = fakeLayer({ globalKeyOverrides: new Set() });
    const layersRef = { current: new Map([[dummyComponent, layer]]) };

    // No override registered → global key fires
    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(true);
  });

  it('returns true when affectOverlay=true (cover check skipped)', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, affectOverlay: true };
    const layer = fakeLayer({ globalKeyOverrides: new Set(['x']) });
    const layersRef = { current: new Map([[dummyComponent, layer]]) };

    // affectOverlay=true skips the cover check entirely
    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(true);
  });

  it('returns true when cover is explicitly false', () => {
    const entry: GlobalKeyEntry = { key: 'x', operate: () => {}, affectOverlay: false, cover: false };
    const layer = fakeLayer({ globalKeyOverrides: new Set(['x']) });
    const layersRef = { current: new Map([[dummyComponent, layer]]) };

    // cover=false means no override possible
    expect(checkGlobalKey(entry, eventNames, dummyComponent, layersRef)).toBe(true);
  });
});
