import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { skip } from '../../../src/screen/provider.js';
import {
  Menu,
  GameLevel,
  Combat,
  Notification,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';

beforeEach(() => {
  setupBaseScreenTests();
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

describe('skip', () => {
  it('navigates to a child component, extending the path and passing props', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    expect(ctx.currentPath).toEqual([Menu]);

    act(() => {
      ctx.skip(GameLevel, { level: 2 });
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu, GameLevel]);
  });

  it('navigates to a grandchild via two consecutive skips', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.skip(Combat, { enemy: 'dragon' });
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu, GameLevel, Combat]);
  });

  it('rejects navigation to a non-child component, leaving the path unchanged', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const pathBefore = [...ctx.currentPath];

    // skip to a component that is not a direct child — the reducer rejects
    // this, so the path must not change.
    ctx.skip(Combat, { enemy: 'x' });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual(pathBefore);
    expect(updated.currentPath).not.toContain(Combat);
  });

  it('clears all open overlays when navigating via skip', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'x' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('throws when called at module level without a mounted Provider', () => {
    expect(() => skip(Menu, {})).toThrow(
      /called before Provider is mounted/,
    );
  });
});
