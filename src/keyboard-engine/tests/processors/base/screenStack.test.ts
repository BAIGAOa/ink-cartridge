import { describe, test, expect, vi } from 'vitest';
import { createScreenStackProcessor } from '../../../src/processors/screenStack.js';
import { createContext, fakeLayer, makeEntry } from '../../_helpers/factories.js';

describe('createScreenStackProcessor', () => {
  const processor = createScreenStackProcessor();

  test('Given anyOverlayConsumed=true, Then skips and returns false', () => {
    const ctx = createContext({ anyOverlayConsumed: true });
    expect(processor.process(ctx)).toBe(false);
  });

  test('Given screen path with no layers, Then returns false', () => {
    const ctx = createContext({ screenPath: ['screenA'] });
    expect(processor.process(ctx)).toBe(false);
  });

  test('Given top screen layer with matching binding, Then event is consumed', () => {
    const handler = vi.fn();
    const layer = fakeLayer({
      bindings: [makeEntry(['x'], handler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      screenPath: ['screenA'],
      layersRef: { current: new Map([['screenA', layer]]) },
    });
    processor.process(ctx);
    expect(handler).toHaveBeenCalled();
  });

  test('Given two screens with same key bound on both, top screen wins and stops iteration', () => {
    const topHandler = vi.fn();
    const bottomHandler = vi.fn();
    const topLayer = fakeLayer({
      bindings: [makeEntry(['x'], topHandler)],
    });
    const bottomLayer = fakeLayer({
      bindings: [makeEntry(['x'], bottomHandler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      screenPath: ['bottom', 'top'],
      layersRef: {
        current: new Map([
          ['bottom', bottomLayer],
          ['top', topLayer],
        ]),
      },
    });
    processor.process(ctx);
    expect(topHandler).toHaveBeenCalled();
    expect(bottomHandler).not.toHaveBeenCalled();
  });

  test('Given top screen has no matching binding, Then falls through to next screen', () => {
    const bottomHandler = vi.fn();
    const topLayer = fakeLayer({ bindings: [] });
    const bottomLayer = fakeLayer({
      bindings: [makeEntry(['x'], bottomHandler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      screenPath: ['bottom', 'top'],
      layersRef: {
        current: new Map([
          ['bottom', bottomLayer],
          ['top', topLayer],
        ]),
      },
    });
    processor.process(ctx);
    expect(bottomHandler).toHaveBeenCalled();
  });

  test('Given no layer for a screen in path, Then that screen is skipped', () => {
    const handler = vi.fn();
    const layer = fakeLayer({
      bindings: [makeEntry(['x'], handler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      screenPath: ['bottom', 'middle', 'top'],
      layersRef: {
        current: new Map([
          ['bottom', layer],
        ]),
      },
    });
    // top and middle have no layers, bottom has one
    processor.process(ctx);
    expect(handler).toHaveBeenCalled();
  });
});
