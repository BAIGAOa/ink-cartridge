import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { back } from '../../../src/screen/provider.js';
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

describe('back', () => {
  it('returns from a child to its parent', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel]);

    act(() => {
      ctx.back();
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu]);
  });

  it('returns from a grandchild to its parent', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.skip(Combat, { enemy: 'goblin' });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel, Combat]);

    act(() => {
      ctx.back();
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu, GameLevel]);
  });

  it('does nothing when called at the root node', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    expect(ctx.currentPath).toEqual([Menu]);

    // back at the root is rejected by the reducer; the path must not change.
    ctx.back();

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu]);
  });

  it('works at module level the same as the hook version', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel]);

    act(() => {
      back();
    });

    expect(getCapture()!.currentPath).toEqual([Menu]);
  });

  it('back(2) goes back two levels at once', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.skip(Combat, { enemy: 'goblin' });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel, Combat]);

    act(() => {
      ctx.back(2);
    });

    expect(getCapture()!.currentPath).toEqual([Menu]);
  });

  it('back(1) is equivalent to back() with no arguments', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.skip(Combat, { enemy: 'goblin' });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel, Combat]);

    act(() => {
      ctx.back(1);
    });

    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel]);
  });

  it('throws when back(0) is called (levels must be >= 1)', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    // The levels < 1 guard runs before dispatch, so the error throws synchronously.
    expect(() => ctx.back(0)).toThrow('levels must be >= 1');
  });

  it('rejects back(n) when n exceeds the current depth, leaving the path unchanged', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel]);

    // back(5) exceeds depth of 2 — the reducer rejects this; path must not change.
    ctx.back(5);

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu, GameLevel]);
  });

  it('clears all open overlays when navigating via back', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'y' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.back();
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('throws when called at module level without a mounted Provider', () => {
    expect(() => back()).toThrow(/called before Provider is mounted/);
  });
});
