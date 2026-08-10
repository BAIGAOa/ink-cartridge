import type { KeyboardLayer } from "../types/keyboard-layer.js";
import type {
  MouseRegionCallbacks,
  MouseRegionEntry,
  MouseRegionRect,
} from "../types/mouse-region.js";
import type { MouseEvent as XtermMouseEvent } from "../xterm-mouse/types/index.js";

/**
 * Default layer id used by regions registered outside any layer/modal
 * context. Hit-tested last, after modal layers and regular layers.
 */
export const ROOT_MOUSE_LAYER_ID = "__mouse_root__";

type StoredRegion = {
  rect: MouseRegionRect;
  callbacks: MouseRegionCallbacks;
  priority: number;
};

function pointInRect(x: number, y: number, rect: MouseRegionRect): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

/**
 * Registry of mouse regions plus hit-testing for mouse events.
 *
 * Owns no framework-specific state — the engine feeds it the current synced
 * layers/modal layers so hit priority matches keyboard events
 * (modal layers > regular layers > root regions, later entries win).
 *
 * Also tracks the currently hovered region (from move events) so enter/leave
 * transitions can be fired exactly once per boundary crossing.
 */
export default class MouseRegionService {
  private regions = new Map<string, Map<string, StoredRegion>>();
  private hovered: { layerId: string; regionId: string } | null = null;
  /**
   * Drag capture: set on `press` (hit), promoted to a real drag on the first
   * `drag` event, cleared on `release`. `dragging` distinguishes a plain
   * click (armed then released) from an actual drag (drag events seen).
   */
  private drag: { layerId: string; regionId: string; dragging: boolean } | null = null;

  /**
   * Register a region. Overwrites any previous registration with the same
   * layerId + regionId (registration order is preserved on overwrite).
   *
   * Rect coordinates are 1-based terminal columns/rows — the same space
   * xterm-mouse events report; host frameworks are responsible for
   * converting their layout coordinates (e.g. adding the live-region
   * viewport offset). Regions whose `layerId` does not match any synced
   * layer fall back to the shared root layer
   * ({@link ROOT_MOUSE_LAYER_ID}), hit-tested last. No callbacks fire
   * until events are fed via {@link process}.
   *
   * @example
   * ```ts
   * const unbind = engine.registerMouseRegion({
   *   layerId: 'board-screen',
   *   regionId: 'board',
   *   rect: { x: 1, y: 1, width: 40, height: 20 },
   *   callbacks: {
   *     onClick: (event, rect) => selectCell(event.x, event.y),
   *     onWheel: (event) => {
   *       if (event.button === 'wheel-up') scrollUp();
   *       if (event.button === 'wheel-down') scrollDown();
   *     },
   *   },
   * });
   * ```
   *
   * @returns An unregister function (idempotent).
   */
  register(entry: MouseRegionEntry): () => void {
    let layerRegions = this.regions.get(entry.layerId);
    if (!layerRegions) {
      layerRegions = new Map();
      this.regions.set(entry.layerId, layerRegions);
    }
    layerRegions.set(entry.regionId, {
      rect: entry.rect,
      callbacks: entry.callbacks,
      priority: entry.priority ?? 0,
    });

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;
      this.unregister(entry.layerId, entry.regionId);
    };
  }

  /**
   * Remove a region by layerId + regionId (idempotent).
   *
   * Also clears hover/drag state that pointed at the removed region, so a
   * disappearing element (layer closed, component unmounted) never leaves a
   * stale hover or drag target behind.
   */
  unregister(layerId: string, regionId: string): void {
    const layer = this.regions.get(layerId);
    if (!layer) return;
    layer.delete(regionId);
    if (layer.size === 0) {
      this.regions.delete(layerId);
    }
    if (
      this.hovered &&
      this.hovered.layerId === layerId &&
      this.hovered.regionId === regionId
    ) {
      this.hovered = null;
    }
    if (
      this.drag &&
      this.drag.layerId === layerId &&
      this.drag.regionId === regionId
    ) {
      this.drag = null;
    }
  }

  /**
   * Process a mouse event: hit-test it against the synced layers and fire
   * the matching callbacks.
   *
   * - `move` events drive hover transitions (enter/leave).
   * - `click` events fire `onClick` (hit-test only).
   * - `wheel` events fire `onWheel` (hit-test only, same priority chain).
   * - `press`/`drag`/`release` drive the drag lifecycle: a press inside a
   *   region arms a drag capture; the first `drag` event promotes it and
   *   fires `onDragStart`/`onDragMove`; `release` fires `onDragEnd` (only if
   *   a real drag happened — plain clicks stay silent here).
   *
   * @returns `true` if the event was consumed by a registered region,
   *          `false` otherwise.
   *
   * @example
   * ```ts
   * // The engine does not parse raw terminal bytes — pair processMouseEvent
   * // with the Mouse helper (or your own parser) that turns stdin data
   * // into XtermMouseEvents, then forward each event into the engine.
   * engine.processMouseEvent(event);
   * ```
   */
  process(
    event: XtermMouseEvent,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): boolean {
    if (event.action === "move") {
      return this.processMove(event, layers, modalLayers);
    }
    if (event.action === "click") {
      return this.processClick(event, layers, modalLayers);
    }
    if (event.action === "wheel") {
      return this.processWheel(event, layers, modalLayers);
    }
    if (event.action === "press") {
      return this.processPress(event, layers, modalLayers);
    }
    if (event.action === "drag") {
      return this.processDrag(event);
    }
    if (event.action === "release") {
      return this.processRelease(event);
    }
    return false;
  }

  private processClick(
    event: XtermMouseEvent,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): boolean {
    const hit = this.hitTest(event.x, event.y, layers, modalLayers);
    if (hit) {
      const region = this.getRegion(hit.layerId, hit.regionId);
      if (region) {
        region.callbacks.onClick?.(event, region.rect);
      }
      return true;
    }
    return false;
  }

  /** Fire `onWheel` on the hit region — same hit-test chain as clicks. */
  private processWheel(
    event: XtermMouseEvent,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): boolean {
    const hit = this.hitTest(event.x, event.y, layers, modalLayers);
    if (hit) {
      const region = this.getRegion(hit.layerId, hit.regionId);
      if (region) {
        region.callbacks.onWheel?.(event, region.rect);
      }
      return true;
    }
    return false;
  }

  /** Arm a potential drag on the hit region. Returns whether a region was hit. */
  private processPress(
    event: XtermMouseEvent,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): boolean {
    const hit = this.hitTest(event.x, event.y, layers, modalLayers);
    this.drag = hit
      ? { layerId: hit.layerId, regionId: hit.regionId, dragging: false }
      : null;
    return hit !== null;
  }

  /** Promote armed press to a real drag; fire drag callbacks on the captured target. */
  private processDrag(event: XtermMouseEvent): boolean {
    if (!this.drag) return false;
    const region = this.getRegion(this.drag.layerId, this.drag.regionId);
    if (!region) return false;
    if (!this.drag.dragging) {
      this.drag.dragging = true;
      region.callbacks.onDragStart?.(event, region.rect);
    }
    // The first drag event is both a start and a move — the cursor already
    // moved before the first report.
    region.callbacks.onDragMove?.(event, region.rect);
    return true;
  }

  /** End a drag (or a plain press) on release. */
  private processRelease(event: XtermMouseEvent): boolean {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return false;
    const region = this.getRegion(drag.layerId, drag.regionId);
    if (region && drag.dragging) {
      region.callbacks.onDragEnd?.(event, region.rect);
    }
    return true;
  }

  /** @returns The currently hovered region, or null. */
  getHovered(): { layerId: string; regionId: string } | null {
    return this.hovered ? { ...this.hovered } : null;
  }

  private processMove(
    event: XtermMouseEvent,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): boolean {
    const hit = this.hitTest(event.x, event.y, layers, modalLayers);
    const prev = this.hovered;

    const stillHovered =
      hit !== null &&
      prev !== null &&
      hit.layerId === prev.layerId &&
      hit.regionId === prev.regionId;

    if (prev && !stillHovered) {
      this.getRegion(prev.layerId, prev.regionId)?.callbacks.onLeave?.(event);
      this.hovered = null;
    }

    if (hit && !stillHovered) {
      const region = this.getRegion(hit.layerId, hit.regionId);
      if (region) {
        region.callbacks.onEnter?.(event, region.rect);
        this.hovered = { layerId: hit.layerId, regionId: hit.regionId };
      }
    }

    return hit !== null;
  }

  /**
   * Find the highest-priority region containing the point: modal layers
   * (reverse order) → regular layers (reverse order) → root regions.
   *
   * While any modal layer is open it takes over mouse hit-testing just like
   * it takes over the keyboard: events never fall through to regular layers
   * or root regions, so clicking "through" a modal cannot trigger the UI
   * underneath.
   */
  private hitTest(
    x: number,
    y: number,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): { layerId: string; regionId: string } | null {
    if (modalLayers.length > 0) {
      for (let i = modalLayers.length - 1; i >= 0; i--) {
        const hit = this.hitLayer(modalLayers[i], x, y);
        if (hit) return hit;
      }
      return null;
    }
    for (let i = layers.length - 1; i >= 0; i--) {
      const hit = this.hitLayer(layers[i], x, y);
      if (hit) return hit;
    }
    return this.hitRoot(x, y);
  }

  private hitLayer(
    layer: KeyboardLayer,
    x: number,
    y: number,
  ): { layerId: string; regionId: string } | null {
    const layerRegions = this.regions.get(layer.layerId);
    if (!layerRegions) return null;
    // Regions are independent of keyboard-layer `activeElements` — the layer
    // being present in the hit-test order is the only gate. Candidate order
    // is registration order, like the root layer.
    const candidates = [...layerRegions.entries()].map(([regionId, region], i) => ({
      regionId,
      priority: region.priority,
      order: i,
    }));
    return this.hitCandidates(candidates, layer.layerId, layerRegions, x, y);
  }

  private hitRoot(x: number, y: number): { layerId: string; regionId: string } | null {
    const rootRegions = this.regions.get(ROOT_MOUSE_LAYER_ID);
    if (!rootRegions) return null;
    const candidates = [...rootRegions.entries()].map(([regionId, region], i) => ({
      regionId,
      priority: region.priority,
      order: i,
    }));
    return this.hitCandidates(candidates, ROOT_MOUSE_LAYER_ID, rootRegions, x, y);
  }

  /**
   * Sort candidates by (priority desc, registration order desc) — higher
   * priority wins, ties go to the later-registered region — then return the
   * first one containing the point.
   */
  private hitCandidates(
    candidates: Array<{ regionId: string; priority: number; order: number }>,
    layerId: string,
    layerRegions: Map<string, StoredRegion>,
    x: number,
    y: number,
  ): { layerId: string; regionId: string } | null {
    candidates.sort((a, b) => b.priority - a.priority || b.order - a.order);
    for (const candidate of candidates) {
      const region = layerRegions.get(candidate.regionId);
      if (region && pointInRect(x, y, region.rect)) {
        return { layerId, regionId: candidate.regionId };
      }
    }
    return null;
  }

  private getRegion(
    layerId: string,
    regionId: string,
  ): StoredRegion | undefined {
    return this.regions.get(layerId)?.get(regionId);
  }
}
