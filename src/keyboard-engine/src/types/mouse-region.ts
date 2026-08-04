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
 * A mouse region registration.
 *
 * `layerId`/`elementId` must match the ids used in the engine's synced
 * {@link import("./state-sync.js").SyncState} layers so hit-testing can apply
 * the same modal > layer > root priority as keyboard events.
 */
export type MouseRegionEntry = {
  /** The layer this region belongs to (must match synced layer ids). */
  layerId: string;
  /** The element id within that layer (must appear in `activeElements`). */
  elementId: string;
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
