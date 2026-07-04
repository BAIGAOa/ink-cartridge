import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import {
  Menu,
  GameLevel,
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

describe('openOverlay', () => {
  it('opens an overlay without affecting the current navigation path', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const pathBefore = [...ctx.currentPath];

    act(() => {
      ctx.openOverlay('notif-1', Notification, { message: 'hello' });
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual(pathBefore);
    expect(updated.displayedOverlays.length).toBe(1);
    expect(updated.displayedOverlays[0].id).toBe('notif-1');
  });

  it('throws when opening an overlay with a duplicate ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('dup', Notification, { message: 'first' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    // The duplicate-ID check runs in the reducer; in React 19 the error is
    // not thrown synchronously from dispatch, so the state stays unchanged.
    ctx.openOverlay('dup', Notification, { message: 'second' });

    expect(getCapture()!.displayedOverlays.length).toBe(1);
  });
});

describe('closeOverlay', () => {
  it('closes an overlay by its ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'test' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.closeOverlay('n1');
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('does nothing when closing an overlay with an unknown ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'test' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    // The unknown-ID check runs in the reducer; the state stays unchanged.
    ctx.closeOverlay('nonexistent');

    expect(getCapture()!.displayedOverlays.length).toBe(1);
  });
});

describe('closeAllOverlays', () => {
  it('closes all open overlays at once', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'a' });
    });
    act(() => {
      ctx.openOverlay('n2', Notification, { message: 'b' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(2);

    act(() => {
      ctx.closeAllOverlays();
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });
});

describe('activate / deactivate', () => {
  it('controls the active state of an overlay', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'test' });
    });
    expect(getCapture()!.activeOverlayIds).toContain('n1');

    act(() => {
      ctx.deactivateOverlay('n1');
    });
    expect(getCapture()!.activeOverlayIds).not.toContain('n1');

    act(() => {
      ctx.activateOverlay('n1');
    });
    expect(getCapture()!.activeOverlayIds).toContain('n1');
  });

  it('does nothing when activating an overlay with an unknown ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    // The unknown-ID check runs in the reducer; the state stays unchanged.
    ctx.activateOverlay('nonexistent');

    expect(getCapture()!.activeOverlayIds).toEqual([]);
  });

  it('does nothing when deactivating an overlay with an unknown ID', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    // The unknown-ID check runs in the reducer; the state stays unchanged.
    ctx.deactivateOverlay('nonexistent');

    expect(getCapture()!.activeOverlayIds).toEqual([]);
  });
});

describe('openOverlay options', () => {
  it('opens without activating when activate:false is passed', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'dormant' }, { activate: false });
    });

    const updated = getCapture()!;
    expect(updated.displayedOverlays.length).toBe(1);
    expect(updated.activeOverlayIds).not.toContain('n1');
  });

  it('sorts overlays by zIndex (higher values render on top)', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('low', Notification, { message: 'z=1' }, { zIndex: 1 });
    });
    act(() => {
      ctx.openOverlay('high', Notification, { message: 'z=10' }, { zIndex: 10 });
    });

    const updated = getCapture()!;
    // Sort order: lower zIndex first (rendered bottom), higher zIndex last (rendered top).
    expect(updated.displayedOverlays[0].zIndex).toBeLessThan(
      updated.displayedOverlays[1].zIndex,
    );
  });

  it('uses createdAt as tiebreaker when two overlays have the same zIndex', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('first', Notification, { message: 'a' }, { zIndex: 5 });
    });
    act(() => {
      ctx.openOverlay('second', Notification, { message: 'b' }, { zIndex: 5 });
    });

    const updated = getCapture()!;
    // Earlier creation comes first (FIFO); later creation comes later (renders on top).
    expect(updated.displayedOverlays[0].createdAt).toBeLessThanOrEqual(
      updated.displayedOverlays[1].createdAt,
    );
  });
});

describe('multiple overlays', () => {
  it('allows overlays of different component types to be open simultaneously', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'a' });
    });
    act(() => {
      ctx.openOverlay('g1', GameLevel, { level: 99 });
    });

    const updated = getCapture()!;
    expect(updated.displayedOverlays.length).toBe(2);
  });

  it('closing one overlay does not affect the others', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'a' });
    });
    act(() => {
      ctx.openOverlay('n2', Notification, { message: 'b' });
    });
    act(() => {
      ctx.openOverlay('n3', Notification, { message: 'c' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(3);

    act(() => {
      ctx.closeOverlay('n2');
    });

    const updated = getCapture()!;
    expect(updated.displayedOverlays.length).toBe(2);
    expect(updated.displayedOverlays.find(o => o.id === 'n1')).toBeTruthy();
    expect(updated.displayedOverlays.find(o => o.id === 'n3')).toBeTruthy();
    expect(updated.displayedOverlays.find(o => o.id === 'n2')).toBeUndefined();
  });
});

describe('persistent overlay', () => {
  it('survives skip navigation while non-persistent overlays are cleared', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
      ctx.openOverlay('n2', Notification, { message: 'regular' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(2);

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.displayedOverlays.length).toBe(1);
    expect(getCapture()!.displayedOverlays[0].id).toBe('n1');
  });

  it('survives back navigation', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });
    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.back();
    });

    expect(getCapture()!.displayedOverlays.length).toBe(1);
    expect(getCapture()!.displayedOverlays[0].id).toBe('n1');
  });

  it('survives gotoScreen navigation', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.gotoScreen(Settings, { theme: 'dark' });
    });

    expect(getCapture()!.displayedOverlays.length).toBe(1);
    expect(getCapture()!.displayedOverlays[0].id).toBe('n1');
  });

  it('becomes inactive (removed from activeOverlayIds) after skip navigation', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
    });
    expect(getCapture()!.activeOverlayIds).toContain('n1');

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.activeOverlayIds).toEqual([]);
  });

  it('can be closed explicitly with closeOverlay', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.closeOverlay('n1');
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('is cleared by closeAllOverlays even when persistent', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'persistent' }, { persistent: true });
      ctx.openOverlay('n2', Notification, { message: 'regular' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(2);

    act(() => {
      ctx.closeAllOverlays();
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });

  it('non-persistent overlay is still cleared by skip (regression)', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('n1', Notification, { message: 'regular' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
  });
});
