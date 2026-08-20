import type { MouseEvent as XtermMouseEvent } from "../xterm-mouse/types/index.js";

/**
 * A rectangular region in terminal coordinates used for mouse hit-testing.
 *
 * Coordinates are **1-based terminal columns/rows** (the same coordinate
 * space xterm-mouse events report). Host frameworks are responsible for
 * converting their layout coordinates into this space (e.g. adding the
 * live-region viewport offset).
 */
export type MouseRegionRect = {
  /** 1-based terminal column of the region's top-left corner. */
  x: number;
  /** 1-based terminal row of the region's top-left corner. */
  y: number;
  /** Region width in terminal cells. */
  width: number;
  /** Region height in terminal cells. */
  height: number;
};

/**
 * Callbacks fired when a mouse event hits the registered region.
 *
 * The second argument is the region rect the event hit — useful for
 * converting the event coordinates back into local cell positions.
 */
export type MouseRegionCallbacks = {
  /** Fired when a click event hits the region. */
  onClick?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
  /**
   * Fired when a wheel event hits the region. `event.button` narrows to
   * `'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'`.
   */
  onWheel?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
  /** Fired when the mouse starts hovering the region (move event hit). */
  onEnter?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
  /** Fired when the mouse leaves the region (previous hover target). */
  onLeave?: (event: XtermMouseEvent) => void;
  /**
   * Fired on the first `drag` event after pressing inside the region —
   * i.e. when a press turned into a real drag. The target is captured from
   * the press, so the drag keeps firing even when the cursor leaves the
   * region.
   */
  onDragStart?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
  /** Fired on every `drag` event while dragging. */
  onDragMove?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
  /** Fired on `release` after a drag (no-op for plain clicks). */
  onDragEnd?: (event: XtermMouseEvent, region: MouseRegionRect) => void;
};

/**
 * The currently hovered mouse region, as returned by
 * {@link KeyboardEngine#getHoveredMouseRegion}.
 */
export interface HoveredRegion {
  /** The layer the hovered region belongs to. */
  layerId: string;
  /** The region's unique identifier within that layer. */
  regionId: string;
}

/**
 * A mouse region registration.
 *
 * `layerId` must match the ids used in the engine's synced
 * {@link SyncState} layers so hit-testing can apply the same modal > layer >
 * root priority as keyboard events: while any modal is open, only the
 * topmost modal layer is hit-tested, and a miss on it is dead (no
 * fall-through to lower modals, regular layers, or root regions). `regionId`
 * is an arbitrary unique identifier for the region within that layer — it is
 * NOT the id of a keyboard layer element; two regions in the same layer must
 * use different ids or the later registration overwrites the earlier one.
 *
 * @example
 * ```ts
 * const unbind = engine.registerMouseRegion({
 *   layerId: 'board-screen',
 *   regionId: 'board',
 *   rect: { x: 1, y: 1, width: 40, height: 20 },
 *   callbacks: {
 *     onClick: (event) => selectCell(event.x, event.y),
 *     onWheel: (event) => {
 *       if (event.button === 'wheel-up') scrollUp();
 *       if (event.button === 'wheel-down') scrollDown();
 *     },
 *   },
 *   priority: 1, // child controls beat their container on overlap
 * });
 * ```
 */
export type MouseRegionEntry = {
  /** The layer this region belongs to (must match synced layer ids). */
  layerId: string;
  /**
   * Unique identifier for this region within the layer. Callers are
   * responsible for uniqueness — duplicate ids in the same layer overwrite
   * each other's registration.
   */
  regionId: string;
  /** The region geometry in 1-based terminal coordinates. */
  rect: MouseRegionRect;
  /** Callbacks fired on hits. */
  callbacks: MouseRegionCallbacks;
  /**
   * Hit-test priority within the same layer. Higher values win when regions
   * overlap (default `0`).
   *
   * This exists because React mounts children before parents, so a child
   * control (e.g. a button inside a panel) would otherwise register before
   * its parent and lose overlap resolution. Give controls a higher priority
   * than their container.
   */
  priority?: number;
};
