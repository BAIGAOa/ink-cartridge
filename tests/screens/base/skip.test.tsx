import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { skip } from '../../../src/screen/provider.js';
import {
  Menu,
  GameLevel,
  Combat,
  StatefulScreen,
  statefulMountCount,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';
import React from 'react';
import { Text } from 'ink';

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
    expect(ctx.currentPath.map((p) => p.component)).toEqual([Menu]);

    act(() => {
      ctx.skip(GameLevel, { level: 2 });
    });

    const updated = getCapture()!;
    expect(updated.currentPath.map((p) => p.component)).toEqual([Menu, GameLevel]);
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
    expect(updated.currentPath.map((p) => p.component)).toEqual([Menu, GameLevel, Combat]);
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
    expect(updated.currentPath.map((p) => p.component)).not.toContain(Combat);
  });

  it('clears all open overlays when navigating via skip', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openLayer('n1', 1);
      ctx.applyElement('n1', {
        elementId: 'n1-el',
        element: () => <Text>popup</Text>,
      });
    });
    expect(getCapture()!.allLayers.length).toBe(1);

    act(() => {
      ctx.skip(GameLevel, { level: 1 });
    });

    expect(getCapture()!.allLayers.length).toBe(0);
  });

  it('throws when called at module level without a mounted Provider', () => {
    expect(() => skip(Menu, {})).toThrow(
      /called before Provider is mounted/,
    );
  });
});

describe('skip same-component refresh', () => {
  beforeEach(() => {
    statefulMountCount.current = 0;
  });

  it('refreshes props without remounting when onlyAttribute is true', async () => {
    const { getCapture, lastFrame } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'a' });
    });
    expect(statefulMountCount.current).toBe(1);
    expect(lastFrame()).toContain('label:a');

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'b' }, { onlyAttribute: true });
    });

    expect(statefulMountCount.current).toBe(1);
    expect(getCapture()!.currentPath.map((p) => p.component)).toEqual([
      Menu,
      StatefulScreen,
    ]);
    expect(lastFrame()).toContain('label:b');
  });

  it('remounts the current screen by default, resetting internal state', async () => {
    const { getCapture, lastFrame } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'a' });
    });
    expect(statefulMountCount.current).toBe(1);

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'b' });
    });

    expect(statefulMountCount.current).toBe(2);
    expect(getCapture()!.currentPath.map((p) => p.component)).toEqual([
      Menu,
      StatefulScreen,
    ]);
    expect(lastFrame()).toContain('label:b');
  });

  it('merges registered template params with caller params', async () => {
    const { getCapture, lastFrame } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    await act(async () => {
      // Empty params intentionally exercise the registered template fallback ({ label: 'init' }).
      ctx.skip(StatefulScreen, {} as React.ComponentProps<typeof StatefulScreen>);
    });
    expect(lastFrame()).toContain('label:init');

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'x' });
    });
    expect(lastFrame()).toContain('label:x');
  });

  it('returns to the real parent with back() after a same-component skip', async () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'a' });
    });
    await act(async () => {
      ctx.skip(StatefulScreen, { label: 'b' }, { onlyAttribute: true });
    });
    await act(async () => {
      ctx.back();
    });

    expect(getCapture()!.currentPath.map((p) => p.component)).toEqual([Menu]);
  });

  it('still rejects navigation to a non-child component', () => {
    const { getCapture } = renderWithCapture(Menu);
    const ctx = getCapture()!;
    const pathBefore = [...getCapture()!.currentPath];

    // The reducer rejects this; the path must not change.
    ctx.skip(Combat, {} as React.ComponentProps<typeof Combat>);

    expect(getCapture()!.currentPath).toEqual(pathBefore);
    expect(getCapture()!.currentPath.map((p) => p.component)).toEqual([Menu]);
  });
});
