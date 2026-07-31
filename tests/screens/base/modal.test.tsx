import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import React from 'react';
import { Text } from 'ink';
import {
  Menu,
  GameLevel,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';
import type { ScreenSystemContextValue } from '../../../src/screen/context.js';

beforeEach(() => {
  setupBaseScreenTests();
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

function ModalPopup() {
  return <Text>modal-popup</Text>;
}

function openModal(
  ctx: ScreenSystemContextValue,
  layerId: string,
  zIndex = 1,
  options?: { crossPage?: boolean },
) {
  ctx.openModalLayer(layerId, zIndex, options);
  ctx.applyElementToModalLayer(layerId, {
    elementId: `${layerId}-el`,
    element: ModalPopup,
  });
}

describe('openModalLayer', () => {
  it('opens a modal layer without affecting navigation or normal layers', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const pathBefore = [...ctx.currentPath];

    act(() => {
      openModal(ctx, 'm1');
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual(pathBefore);
    expect(updated.allLayers.length).toBe(0);
    expect(updated.allModalLayers.length).toBe(1);
    expect(updated.allModalLayers[0].layerId).toBe('m1');
    expect(updated.allModalLayers[0].elements.size).toBe(1);
  });

  it('throws when opening a modal layer with a duplicate ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'dup');
    });
    expect(getCapture()!.allModalLayers.length).toBe(1);

    ctx.openModalLayer('dup', 2);
    expect(getCapture()!.allModalLayers.length).toBe(1);
  });

  it('leaves state unchanged when a modal ID collides with a layer ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openLayer('shared', 1);
      ctx.applyElement('shared', { elementId: 'shared-el', element: ModalPopup });
    });
    expect(getCapture()!.allLayers.length).toBe(1);

    ctx.openModalLayer('shared', 2);
    expect(getCapture()!.allModalLayers.length).toBe(0);
    expect(getCapture()!.allLayers.length).toBe(1);
  });
});

describe('closeModalLayer', () => {
  it('closes a modal layer by its ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1');
    });
    expect(getCapture()!.allModalLayers.length).toBe(1);

    act(() => {
      ctx.closeModalLayer('m1');
    });

    expect(getCapture()!.allModalLayers.length).toBe(0);
  });

  it('does nothing when closing an unknown modal layer', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1');
    });
    ctx.closeModalLayer('missing');
    expect(getCapture()!.allModalLayers.length).toBe(1);
  });
});

describe('closeAllModalLayer', () => {
  it('closes all modal layers at once', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1');
      openModal(ctx, 'm2', 2);
    });
    expect(getCapture()!.allModalLayers.length).toBe(2);

    act(() => {
      ctx.closeAllModalLayer();
    });

    expect(getCapture()!.allModalLayers.length).toBe(0);
  });
});

describe('modal layer ordering', () => {
  it('sorts modal layers by zIndex', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'low', 1);
      openModal(ctx, 'high', 10);
    });

    expect(getCapture()!.allModalLayers.map((layer) => layer.zIndex)).toEqual([
      1,
      10,
    ]);
  });
});

describe('modal element lifecycle', () => {
  it('erases and reactivates elements', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1');
    });
    expect(getCapture()!.allModalLayers[0].elements.size).toBe(1);

    act(() => {
      ctx.eraseElementInModalLayer('m1', 'm1-el');
    });
    expect(getCapture()!.allModalLayers[0].elements.size).toBe(0);

    act(() => {
      ctx.applyElementToModalLayer('m1', {
        elementId: 'm1-el',
        element: ModalPopup,
      });
      ctx.deactivateElementInModalLayer('m1', 'm1-el');
    });
    expect(getCapture()!.allModalLayers[0].elements.get('m1-el')?.active).toBe(
      false,
    );

    act(() => {
      ctx.activateElementInModalLayer('m1', 'm1-el');
    });
    expect(getCapture()!.allModalLayers[0].elements.get('m1-el')?.active).not.toBe(
      false,
    );
  });
});

describe('cross-page modal layers', () => {
  it('clears non-crossPage modal layers on navigation', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1');
    });
    expect(getCapture()!.allModalLayers.length).toBe(1);

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.allModalLayers.length).toBe(0);
  });

  it('keeps crossPage modal layers after navigation', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      openModal(ctx, 'm1', 1, { crossPage: true });
    });

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.allModalLayers.map((layer) => layer.layerId)).toEqual([
      'm1',
    ]);
  });
});
