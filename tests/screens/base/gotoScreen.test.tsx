import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { gotoScreen } from '../../../src/screen/provider.js';
import {
  Menu,
  GameLevel,
  Combat,
  Settings,
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

describe('gotoScreen', () => {
  it('jumps across branches via LCA resolution', () => {
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
      ctx.gotoScreen(Settings, { theme: 'light' });
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual([Menu, Settings]);
  });

  it('throws when the target component is not registered', () => {
    function Ghost() {
      return null;
    }
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    // The is-registered guard runs before dispatch, so the error throws synchronously.
    expect(() => ctx.gotoScreen(Ghost as any, {})).toThrow(
      'is not registered',
    );
  });

  it('works at module level the same as the hook version', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    expect(getCapture()!.currentPath).toEqual([Menu, GameLevel]);

    act(() => {
      gotoScreen(Settings, { theme: 'solarized' });
    });

    expect(getCapture()!.currentPath).toEqual([Menu, Settings]);
  });

  it('clears all open overlays when navigating via gotoScreen', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'z' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.gotoScreen(Settings, { theme: 'dark' });
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('clears all open modals when navigating via gotoScreen', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openModal('m1', Notification, { message: 'modal' });
    });
    expect(getCapture()!.modalQueue.length).toBe(1);

    act(() => {
      ctx.gotoScreen(Settings, { theme: 'dark' });
    });

    const updated = getCapture()!;
    expect(updated.modalQueue.length).toBe(0);
  });

  it('throws when called at module level without a mounted Provider', () => {
    expect(() => gotoScreen(Menu, {})).toThrow(
      /called before Provider is mounted/,
    );
  });
});
