import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { Text } from 'ink';
import React from 'react';
import {
  Menu,
  GameLevel,
  Settings,
  Notification,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';
import { registerComponent } from '../../../src/screen/registry.js';
import { openModal } from '../../../src/screen/provider.js';

beforeEach(() => {
  setupBaseScreenTests();
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

// A minimal component for modal rendering
function DummyModal() {
  return React.createElement(Text, null, 'modal');
}
DummyModal.displayName = 'DummyModal';

describe('openModal', () => {
  it('opens a modal without affecting navigation path or overlays', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const pathBefore = [...ctx.currentPath];

    act(() => {
      ctx.openModal('m1', DummyModal, {});
    });

    const updated = getCapture()!;
    expect(updated.currentPath).toEqual(pathBefore);
    expect(updated.displayedOverlays.length).toBe(0);
    expect(updated.modalQueue.length).toBe(1);
    expect(updated.modalQueue[0].id).toBe('m1');
    expect(updated.activeModalId).toBe('m1');
  });

  it('throws when component is not registered — context version', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    expect(() => {
      ctx.openModal('m1', DummyModal, {});
    }).toThrow(/is not registered/);
  });

  it('throws when component is not registered — module-level version', () => {
    expect(() => {
      openModal('m1', DummyModal, {});
    }).toThrow(/is not registered/);
  });

  it('duplicate modal ID leaves state unchanged', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openModal('dup', DummyModal, {});
    });
    expect(getCapture()!.modalQueue.length).toBe(1);

    // Duplicate-ID check runs in the reducer; state stays unchanged.
    ctx.openModal('dup', DummyModal, {});
    expect(getCapture()!.modalQueue.length).toBe(1);
  });

  it('modal ID colliding with existing overlay ID leaves state unchanged', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('shared-id', Notification, { message: 'test' });
    });
    expect(getCapture()!.displayedOverlays.length).toBe(1);

    ctx.openModal('shared-id', DummyModal, {});
    expect(getCapture()!.modalQueue.length).toBe(0);
    expect(getCapture()!.displayedOverlays.length).toBe(1);
  });

  it('default zIndex equals the current modal count', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('a', DummyModal, {}); });
    act(() => { ctx.openModal('b', DummyModal, {}); });
    act(() => { ctx.openModal('c', DummyModal, {}); });

    const modals = getCapture()!.modalQueue;
    expect(modals.length).toBe(3);
    expect(modals[0].zIndex).toBe(0);
    expect(modals[1].zIndex).toBe(1);
    expect(modals[2].zIndex).toBe(2);
  });

  it('custom zIndex determines which modal is active', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('low', DummyModal, {}, { zIndex: 1 }); });
    act(() => { ctx.openModal('high', DummyModal, {}, { zIndex: 10 }); });

    expect(getCapture()!.activeModalId).toBe('high');
    expect(getCapture()!.modalQueue.length).toBe(2);
  });

  it('renderNow causes background modal to appear in renderedModalEntries', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('bg', DummyModal, {}, { zIndex: 1, renderNow: true }); });
    act(() => { ctx.openModal('fg', DummyModal, {}, { zIndex: 2 }); });

    const rendered = getCapture()!.renderedModalEntries;
    expect(rendered.length).toBe(2);
    expect(rendered.map(e => e.id)).toContain('bg');
    expect(rendered.map(e => e.id)).toContain('fg');
  });

  it('renderNow false (default) — only the active modal is rendered', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('bg', DummyModal, {}, { zIndex: 1 }); });
    act(() => { ctx.openModal('fg', DummyModal, {}, { zIndex: 2 }); });

    const rendered = getCapture()!.renderedModalEntries;
    expect(rendered.length).toBe(1);
    expect(rendered[0].id).toBe('fg');
  });
});

describe('closeModal', () => {
  it('closes a specific modal by ID', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}); });
    act(() => { ctx.openModal('m2', DummyModal, {}); });
    expect(getCapture()!.modalQueue.length).toBe(2);

    act(() => { ctx.closeModal('m1'); });
    expect(getCapture()!.modalQueue.length).toBe(1);
    expect(getCapture()!.modalQueue[0].id).toBe('m2');
  });

  it('active switches to next highest zIndex when the active modal is closed', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('low', DummyModal, {}, { zIndex: 1 }); });
    act(() => { ctx.openModal('high', DummyModal, {}, { zIndex: 10 }); });
    expect(getCapture()!.activeModalId).toBe('high');

    act(() => { ctx.closeModal('high'); });
    expect(getCapture()!.activeModalId).toBe('low');
  });

  it('activeModalId becomes null when the last modal is closed', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('only', DummyModal, {}); });
    expect(getCapture()!.activeModalId).toBe('only');

    act(() => { ctx.closeModal('only'); });
    expect(getCapture()!.activeModalId).toBeNull();
    expect(getCapture()!.modalQueue.length).toBe(0);
  });

  it('unknown ID leaves state unchanged', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}); });
    expect(getCapture()!.modalQueue.length).toBe(1);

    ctx.closeModal('nonexistent');
    expect(getCapture()!.modalQueue.length).toBe(1);
  });
});

describe('closeAllModals', () => {
  it('closes all open modals at once', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}); });
    act(() => { ctx.openModal('m2', DummyModal, {}); });
    act(() => { ctx.openModal('m3', DummyModal, {}); });
    expect(getCapture()!.modalQueue.length).toBe(3);

    act(() => { ctx.closeAllModals(); });
    expect(getCapture()!.modalQueue.length).toBe(0);
    expect(getCapture()!.activeModalId).toBeNull();
  });

  it('is a no-op when no modals are open', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    expect(() => {
      act(() => { ctx.closeAllModals(); });
    }).not.toThrow();
    expect(getCapture()!.modalQueue.length).toBe(0);
  });
});

describe('modal interactions', () => {
  it('modal is unaffected by closeAllOverlays', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}); });
    act(() => { ctx.openOverlay('ovl', Notification, { message: 'test' }); });

    act(() => { ctx.closeAllOverlays(); });

    expect(getCapture()!.displayedOverlays.length).toBe(0);
    expect(getCapture()!.modalQueue.length).toBe(1);
  });

  it('navigation via gotoScreen clears all modals', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}); });
    act(() => { ctx.openModal('m2', DummyModal, {}); });
    expect(getCapture()!.modalQueue.length).toBe(2);

    act(() => { ctx.skip(GameLevel, { level: 1 }); });
    expect(getCapture()!.modalQueue.length).toBe(0);
  });
});

describe('persistent modal', () => {
  it('survives skip navigation', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    expect(getCapture()!.modalQueue.length).toBe(1);

    act(() => { ctx.skip(GameLevel, { level: 1 }); });

    expect(getCapture()!.modalQueue.length).toBe(1);
    expect(getCapture()!.modalQueue[0].id).toBe('m1');
  });

  it('survives back navigation', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.skip(GameLevel, { level: 1 }); });
    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    expect(getCapture()!.modalQueue.length).toBe(1);

    act(() => { ctx.back(); });

    expect(getCapture()!.modalQueue.length).toBe(1);
    expect(getCapture()!.modalQueue[0].id).toBe('m1');
  });

  it('survives gotoScreen navigation', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    expect(getCapture()!.modalQueue.length).toBe(1);

    act(() => { ctx.gotoScreen(Settings, { theme: 'dark' }); });

    expect(getCapture()!.modalQueue.length).toBe(1);
    expect(getCapture()!.modalQueue[0].id).toBe('m1');
  });

  it('becomes inactive (activeModalId is null) after skip navigation', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    expect(getCapture()!.activeModalId).toBe('m1');

    act(() => { ctx.skip(GameLevel, { level: 1 }); });

    expect(getCapture()!.activeModalId).toBeNull();
  });

  it('can be closed explicitly with closeModal', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    expect(getCapture()!.modalQueue.length).toBe(1);

    act(() => { ctx.closeModal('m1'); });

    expect(getCapture()!.modalQueue.length).toBe(0);
  });

  it('is cleared by closeAllModals even when persistent', () => {
    registerComponent(DummyModal, {});
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => { ctx.openModal('m1', DummyModal, {}, { persistent: true }); });
    act(() => { ctx.openModal('m2', DummyModal, {}); });
    expect(getCapture()!.modalQueue.length).toBe(2);

    act(() => { ctx.closeAllModals(); });

    expect(getCapture()!.modalQueue.length).toBe(0);
  });
});
