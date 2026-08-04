import { beforeEach, describe, expect, test, vi } from 'vitest';
import MouseRegionService, {
  ROOT_MOUSE_LAYER_ID,
} from '../../../src/engine/MouseRegionService.js';
import type { KeyboardLayer } from '../../../src/types/keyboard-layer.js';
import type { MouseRegionRect } from '../../../src/types/mouse-region.js';
import type { MouseEvent } from '../../../src/xterm-mouse/types/index.js';

type Action = MouseEvent['action'];

function makeEvent(partial: Partial<MouseEvent> & { action: Action }): MouseEvent {
  return {
    x: 1,
    y: 1,
    button: 'left',
    shift: false,
    alt: false,
    ctrl: false,
    raw: 0,
    data: '',
    protocol: 'SGR',
    ...partial,
  };
}

function makeLayer(layerId: string, activeElements: string[]): KeyboardLayer {
  return { layerId, elements: activeElements, activeElements };
}

const RECT: MouseRegionRect = { x: 1, y: 1, width: 3, height: 3 };

describe('MouseRegionService', () => {
  let svc: MouseRegionService;

  beforeEach(() => {
    svc = new MouseRegionService();
  });

  describe('register / hit-testing', () => {
    test('fires onClick when a click lands inside the region and returns true', () => {
      const onClick = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick },
      });

      const consumed = svc.process(
        makeEvent({ action: 'click', x: 2, y: 2 }),
        [],
        [],
      );

      expect(consumed).toBe(true);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0]).toMatchObject({ x: 2, y: 2 });
      expect(onClick.mock.calls[0][1]).toEqual(RECT);
    });

    test('returns false when the click is outside every region', () => {
      const onClick = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick },
      });

      const consumed = svc.process(
        makeEvent({ action: 'click', x: 10, y: 10 }),
        [],
        [],
      );

      expect(consumed).toBe(false);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('re-registering the same elementId overwrites rect and callbacks', () => {
      const first = vi.fn();
      const second = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick: first },
      });
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: { x: 10, y: 10, width: 2, height: 2 },
        callbacks: { onClick: second },
      });

      // Old rect: hit nothing.
      expect(svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], [])).toBe(false);
      // New rect: hit fires the new callback only.
      expect(svc.process(makeEvent({ action: 'click', x: 11, y: 11 }), [], [])).toBe(true);
      expect(second).toHaveBeenCalledTimes(1);
      expect(first).not.toHaveBeenCalled();
    });
  });

  describe('hit priority', () => {
    test('modal layers beat regular layers beat root regions', () => {
      const modalHit = vi.fn();
      const layerHit = vi.fn();
      const rootHit = vi.fn();
      svc.register({
        layerId: 'modal-1',
        elementId: 'm1',
        rect: RECT,
        callbacks: { onClick: modalHit },
      });
      svc.register({
        layerId: 'layer-1',
        elementId: 'l1',
        rect: RECT,
        callbacks: { onClick: layerHit },
      });
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'r1',
        rect: RECT,
        callbacks: { onClick: rootHit },
      });

      const layers = [makeLayer('layer-1', ['l1'])];
      const modalLayers = [makeLayer('modal-1', ['m1'])];
      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), layers, modalLayers);

      expect(modalHit).toHaveBeenCalledTimes(1);
      expect(layerHit).not.toHaveBeenCalled();
      expect(rootHit).not.toHaveBeenCalled();

      // Modal closed → layer wins.
      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), layers, []);
      expect(layerHit).toHaveBeenCalledTimes(1);

      // Layer closed → root wins.
      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], []);
      expect(rootHit).toHaveBeenCalledTimes(1);
    });

    test('within a layer, later-registered active elements win on overlap', () => {
      const first = vi.fn();
      const second = vi.fn();
      svc.register({
        layerId: 'layer-1',
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick: first },
      });
      svc.register({
        layerId: 'layer-1',
        elementId: 'b',
        rect: RECT,
        callbacks: { onClick: second },
      });

      // Both are active and overlap — b (registered later) wins.
      const layers = [makeLayer('layer-1', ['a', 'b'])];
      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), layers, []);
      expect(second).toHaveBeenCalledTimes(1);
      expect(first).not.toHaveBeenCalled();

      // Deactivating b (removing from activeElements) lets a win.
      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [makeLayer('layer-1', ['a'])], []);
      expect(first).toHaveBeenCalledTimes(1);
    });

    test('priority overrides registration order within the same layer', () => {
      const low = vi.fn();
      const high = vi.fn();
      // Parent registered after the child (React mounts children first) —
      // without priority the parent would win; priority inverts it.
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'child',
        rect: RECT,
        callbacks: { onClick: high },
        priority: 1,
      });
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'parent',
        rect: RECT,
        callbacks: { onClick: low },
      });

      svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], []);
      expect(high).toHaveBeenCalledTimes(1);
      expect(low).not.toHaveBeenCalled();
    });
  });

  describe('hover transitions (move)', () => {
    test('fires onEnter on entry, onLeave on exit, and stays silent while inside', () => {
      const onEnter = vi.fn();
      const onLeave = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onEnter, onLeave },
      });

      // Enter.
      svc.process(makeEvent({ action: 'move', x: 2, y: 2 }), [], []);
      expect(onEnter).toHaveBeenCalledTimes(1);

      // Move inside — no duplicate enter/leave.
      svc.process(makeEvent({ action: 'move', x: 3, y: 3 }), [], []);
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onLeave).not.toHaveBeenCalled();

      // Leave.
      svc.process(makeEvent({ action: 'move', x: 9, y: 9 }), [], []);
      expect(onLeave).toHaveBeenCalledTimes(1);

      // Re-enter fires enter again.
      svc.process(makeEvent({ action: 'move', x: 1, y: 1 }), [], []);
      expect(onEnter).toHaveBeenCalledTimes(2);
    });

    test('switching hovered regions fires leave on the old and enter on the new', () => {
      const aEnter = vi.fn();
      const aLeave = vi.fn();
      const bEnter = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: { x: 1, y: 1, width: 2, height: 2 },
        callbacks: { onEnter: aEnter, onLeave: aLeave },
      });
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'b',
        rect: { x: 5, y: 5, width: 2, height: 2 },
        callbacks: { onEnter: bEnter },
      });

      svc.process(makeEvent({ action: 'move', x: 1, y: 1 }), [], []);
      expect(aEnter).toHaveBeenCalledTimes(1);

      svc.process(makeEvent({ action: 'move', x: 6, y: 6 }), [], []);
      expect(aLeave).toHaveBeenCalledTimes(1);
      expect(bEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe('drag lifecycle (press / drag / release)', () => {
    test('press → drag → release fires start, move, end in order', () => {
      const onDragStart = vi.fn();
      const onDragMove = vi.fn();
      const onDragEnd = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onDragStart, onDragMove, onDragEnd },
      });

      svc.process(makeEvent({ action: 'press', x: 2, y: 2 }), [], []);
      expect(onDragStart).not.toHaveBeenCalled();

      // First drag event: both start and move (the cursor already moved).
      svc.process(makeEvent({ action: 'drag', x: 3, y: 3 }), [], []);
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(onDragMove).toHaveBeenCalledTimes(1);
      expect(onDragMove.mock.calls[0][0]).toMatchObject({ x: 3, y: 3 });

      svc.process(makeEvent({ action: 'drag', x: 5, y: 5 }), [], []);
      expect(onDragMove).toHaveBeenCalledTimes(2);
      expect(onDragMove.mock.calls[1][0]).toMatchObject({ x: 5, y: 5 });

      svc.process(makeEvent({ action: 'release', x: 6, y: 6 }), [], []);
      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(onDragEnd.mock.calls[0][0]).toMatchObject({ x: 6, y: 6 });
    });

    test('plain click (press + release without drag) fires no drag callbacks', () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onDragStart, onDragEnd },
      });

      svc.process(makeEvent({ action: 'press', x: 2, y: 2 }), [], []);
      svc.process(makeEvent({ action: 'release', x: 2, y: 2 }), [], []);

      expect(onDragStart).not.toHaveBeenCalled();
      expect(onDragEnd).not.toHaveBeenCalled();
    });

    test('drag keeps firing even when the cursor leaves the region (capture)', () => {
      const onDragMove = vi.fn();
      const onDragEnd = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onDragMove, onDragEnd },
      });

      svc.process(makeEvent({ action: 'press', x: 2, y: 2 }), [], []);
      // Cursor now far outside the region — still the captured target.
      svc.process(makeEvent({ action: 'drag', x: 40, y: 40 }), [], []);
      expect(onDragMove).toHaveBeenCalledTimes(1);

      svc.process(makeEvent({ action: 'release', x: 41, y: 41 }), [], []);
      expect(onDragEnd).toHaveBeenCalledTimes(1);
    });

    test('press outside any region does not capture, so drags are ignored', () => {
      const onDragMove = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onDragMove },
      });

      svc.process(makeEvent({ action: 'press', x: 50, y: 50 }), [], []);
      svc.process(makeEvent({ action: 'drag', x: 51, y: 51 }), [], []);
      expect(onDragMove).not.toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    test('removed regions no longer receive events', () => {
      const onClick = vi.fn();
      const unregister = svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick },
      });

      unregister();
      const consumed = svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], []);
      expect(consumed).toBe(false);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('unregister is idempotent', () => {
      const onClick = vi.fn();
      const unregister = svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onClick },
      });

      unregister();
      unregister();
      expect(() => svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], [])).not.toThrow();
    });

    test('unregistering the hovered region clears the hover state', () => {
      const onEnter = vi.fn();
      const unregister = svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onEnter },
      });

      svc.process(makeEvent({ action: 'move', x: 2, y: 2 }), [], []);
      expect(svc.getHovered()).toEqual({ layerId: ROOT_MOUSE_LAYER_ID, elementId: 'a' });

      unregister();
      expect(svc.getHovered()).toBeNull();
    });

    test('unregistering the drag target mid-drag drops the capture', () => {
      const onDragMove = vi.fn();
      const unregister = svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'a',
        rect: RECT,
        callbacks: { onDragMove },
      });

      svc.process(makeEvent({ action: 'press', x: 2, y: 2 }), [], []);
      unregister();
      // Subsequent drags hit nothing — capture was dropped.
      expect(svc.process(makeEvent({ action: 'drag', x: 3, y: 3 }), [], [])).toBe(false);
      expect(onDragMove).not.toHaveBeenCalled();
    });
  });

  describe('root fallback', () => {
    test('regions outside any layer are hit-tested last via the root layer id', () => {
      const rootHit = vi.fn();
      svc.register({
        layerId: ROOT_MOUSE_LAYER_ID,
        elementId: 'r1',
        rect: RECT,
        callbacks: { onClick: rootHit },
      });

      // Only root registered — an event with no layers/modal layers still hits it.
      expect(svc.process(makeEvent({ action: 'click', x: 2, y: 2 }), [], [])).toBe(true);
      expect(rootHit).toHaveBeenCalledTimes(1);
    });
  });
});
