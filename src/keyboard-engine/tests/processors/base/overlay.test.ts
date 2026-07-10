import { describe, test, expect, vi } from 'vitest';
import { createOverlayProcessor } from '../../../src/processors/overlay.js';
import {
  createContext,
  fakeLayer,
  makeEntry,
  makeOverlayEntry,
} from '../../_helpers/factories.js';

describe('createOverlayProcessor', () => {
  const processor = createOverlayProcessor();

  test('Given no active overlays, Then returns false', () => {
    const ctx = createContext();
    expect(processor.process(ctx)).toBe(false);
  });

  test('Given active overlays with no layers, Then returns false', () => {
    const ctx = createContext({ activeOverlays: [makeOverlayEntry('ov1')] });
    expect(processor.process(ctx)).toBe(false);
  });

  test('Given overlay layer with matching binding, Then sets anyOverlayConsumed and continues', () => {
    const handler = vi.fn();
    const layer = fakeLayer({
      kind: 'overlay',
      bindings: [makeEntry(['x'], handler)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      activeOverlays: [makeOverlayEntry('ov1')],
      layersRef: { current: new Map([['ov1', layer]]) },
    });
    const result = processor.process(ctx);
    expect(result).toBe(false); // always returns false
    expect(ctx.anyOverlayConsumed).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  test('Given two overlays, both receive the event (broadcast semantics)', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const layer1 = fakeLayer({
      kind: 'overlay',
      bindings: [makeEntry(['x'], h1)],
    });
    const layer2 = fakeLayer({
      kind: 'overlay',
      bindings: [makeEntry(['x'], h2)],
    });
    const ctx = createContext({
      eventNames: ['x'],
      input: 'x',
      activeOverlays: [makeOverlayEntry('ov1'), makeOverlayEntry('ov2')],
      layersRef: {
        current: new Map([
          ['ov1', layer1],
          ['ov2', layer2],
        ]),
      },
    });
    processor.process(ctx);
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
    expect(ctx.anyOverlayConsumed).toBe(true);
  });
});
