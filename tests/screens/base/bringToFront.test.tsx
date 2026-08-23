import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import {
  Menu,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';
import type { ScreenSystemContextValue } from '../../../src/screen/context.js';
import { bringLayerToFront as moduleBringLayerToFront } from '../../../src/screen/provider.js';

beforeEach(() => {
  setupBaseScreenTests();
  popupMountCount.current = 0;
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

// Mount counter for the layer element — proves bringLayerToFront does not
// remount the element components (its internal state survives).
const popupMountCount: { current: number } = { current: 0 };

function Popup({ label }: { label: string }) {
  useEffect(() => {
    popupMountCount.current += 1;
  }, []);
  return <Text>{label}</Text>;
}

function openPopup(
  ctx: ScreenSystemContextValue,
  layerId: string,
  zIndex: number,
) {
  ctx.openLayer(layerId, zIndex);
  ctx.applyElement(layerId, {
    elementId: `${layerId}-el`,
    element: Popup,
    props: { label: layerId },
  });
}

describe('bringLayerToFront', () => {
  it('raises a middle layer to the top with zIndex max + 1', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'a', 1);
      openPopup(ctx, 'b', 2);
      openPopup(ctx, 'c', 3);
    });

    act(() => {
      ctx.bringLayerToFront('a');
    });

    const layers = getCapture()!.allLayers;
    expect(layers.map((layer) => layer.layerId)).toEqual(['b', 'c', 'a']);
    expect(layers.map((layer) => layer.zIndex)).toEqual([2, 3, 4]);
  });

  it('keeps elements and regionFocus references (no remount)', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
    });

    const lowBefore = getCapture()!.allLayers[0];
    const elementsRef = lowBefore.elements;
    const regionFocusRef = lowBefore.regionFocus;
    const mountsBefore = popupMountCount.current;

    act(() => {
      ctx.bringLayerToFront('low');
    });

    const lowAfter = getCapture()!.allLayers[1];
    expect(lowAfter.elements).toBe(elementsRef);
    expect(lowAfter.regionFocus).toBe(regionFocusRef);
    expect(popupMountCount.current).toBe(mountsBefore);
  });

  it('does nothing when the layer is already the top layer', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
    });

    const before = getCapture()!.allLayers;
    act(() => {
      ctx.bringLayerToFront('high');
    });

    // Reducer returned the identical state, so the array reference is the
    // same — no re-render, no zIndex drift.
    const after = getCapture()!.allLayers;
    expect(after).toBe(before);
    expect(after.map((layer) => layer.layerId)).toEqual(['low', 'high']);
  });

  it('ignores unknown IDs and modal layer IDs', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() => {
      openPopup(ctx, 'low', 1);
      ctx.openModalLayer('m', 10);
      ctx.applyElementToModalLayer('m', {
        elementId: 'm-el',
        element: Popup,
        props: { label: 'm' },
      });
    });

    act(() => {
      ctx.bringLayerToFront('nope');
    });
    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'low',
    ]);

    act(() => {
      ctx.bringLayerToFront('m');
    });
    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'low',
    ]);
    expect(getCapture()!.allModalLayers.map((layer) => layer.layerId)).toEqual([
      'm',
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('never affects the modal layer zIndex space', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
      ctx.openModalLayer('m', 10);
      ctx.applyElementToModalLayer('m', {
        elementId: 'm-el',
        element: Popup,
        props: { label: 'm' },
      });
    });

    act(() => {
      ctx.bringLayerToFront('low');
    });

    // The raise took its max zIndex from the REGULAR layers only (2 → 3) —
    // the modal layer keeps its own zIndex untouched.
    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'high',
      'low',
    ]);
    expect(getCapture()!.allLayers[1].zIndex).toBe(3);
    expect(getCapture()!.allModalLayers[0].zIndex).toBe(10);
  });

  it('keeps incrementing zIndex on repeated raises', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'a', 1);
      openPopup(ctx, 'b', 2);
      openPopup(ctx, 'c', 3);
    });

    act(() => {
      ctx.bringLayerToFront('a');
    });
    act(() => {
      ctx.bringLayerToFront('b');
    });
    act(() => {
      ctx.bringLayerToFront('a');
    });

    const layers = getCapture()!.allLayers;
    expect(layers.map((layer) => layer.layerId)).toEqual(['c', 'b', 'a']);
    expect(layers.map((layer) => layer.zIndex)).toEqual([3, 5, 6]);
  });

  it('works as a module-level function', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
    });

    act(() => {
      moduleBringLayerToFront('low');
    });

    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'high',
      'low',
    ]);
  });
});

describe('restoreLayerZIndex', () => {
  it('puts a raised layer back to its initial zIndex', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'a', 1);
      openPopup(ctx, 'b', 2);
      openPopup(ctx, 'c', 3);
    });

    act(() => {
      ctx.bringLayerToFront('a');
    });
    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'b',
      'c',
      'a',
    ]);

    act(() => {
      ctx.restoreLayerZIndex('a');
    });

    const layers = getCapture()!.allLayers;
    expect(layers.map((layer) => layer.layerId)).toEqual(['a', 'b', 'c']);
    expect(layers.map((layer) => layer.zIndex)).toEqual([1, 2, 3]);
  });

  it('undoes every raise in one call (idempotent against repeated raises)', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'a', 1);
      openPopup(ctx, 'b', 2);
      openPopup(ctx, 'c', 3);
    });

    // a is raised twice (4 then 6) — each raise needed another layer on top
    // first, since raising the current top layer is a no-op.
    act(() => {
      ctx.bringLayerToFront('a');
    });
    act(() => {
      ctx.bringLayerToFront('b');
    });
    act(() => {
      ctx.bringLayerToFront('a');
    });
    expect(getCapture()!.allLayers[2].zIndex).toBe(6);

    act(() => {
      ctx.restoreLayerZIndex('a');
    });
    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(getCapture()!.allLayers[0].zIndex).toBe(1);
  });

  it('does nothing when the layer was never raised', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
    });

    const before = getCapture()!.allLayers;
    act(() => {
      ctx.restoreLayerZIndex('high');
    });

    // Reducer returned the identical state — no re-render.
    expect(getCapture()!.allLayers).toBe(before);
  });

  it('keeps elements and regionFocus references while restoring', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openPopup(ctx, 'low', 1);
      openPopup(ctx, 'high', 2);
    });

    const lowBefore = getCapture()!.allLayers[0];
    const elementsRef = lowBefore.elements;
    const regionFocusRef = lowBefore.regionFocus;
    const mountsBefore = popupMountCount.current;

    act(() => {
      ctx.bringLayerToFront('low');
    });
    act(() => {
      ctx.restoreLayerZIndex('low');
    });

    const lowAfter = getCapture()!.allLayers[0];
    expect(lowAfter.elements).toBe(elementsRef);
    expect(lowAfter.regionFocus).toBe(regionFocusRef);
    expect(popupMountCount.current).toBe(mountsBefore);
  });

  it('ignores unknown IDs and modal layer IDs', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() => {
      openPopup(ctx, 'low', 1);
      ctx.openModalLayer('m', 10);
      ctx.applyElementToModalLayer('m', {
        elementId: 'm-el',
        element: Popup,
        props: { label: 'm' },
      });
    });

    act(() => {
      ctx.restoreLayerZIndex('nope');
    });
    act(() => {
      ctx.restoreLayerZIndex('m');
    });

    expect(getCapture()!.allLayers.map((layer) => layer.layerId)).toEqual([
      'low',
    ]);
    expect(getCapture()!.allModalLayers.map((layer) => layer.layerId)).toEqual([
      'm',
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
