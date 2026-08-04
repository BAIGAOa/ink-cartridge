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
  private hovered: { layerId: string; elementId: string } | null = null;
  /**
   * Drag capture: set on `press` (hit), promoted to a real drag on the first
   * `drag` event, cleared on `release`. `dragging` distinguishes a plain
   * click (armed then released) from an actual drag (drag events seen).
   */
  private drag: { layerId: string; elementId: string; dragging: boolean } | null = null;

  /**
   * Register a region. Overwrites any previous registration with the same
   * layerId + elementId (registration order is preserved on overwrite).
   *
   * @returns An unregister function (idempotent).
   */
  register(entry: MouseRegionEntry): () => void {
    let layerRegions = this.regions.get(entry.layerId);
    if (!layerRegions) {
      layerRegions = new Map();
      this.regions.set(entry.layerId, layerRegions);
    }
    layerRegions.set(entry.elementId, {
      rect: entry.rect,
      callbacks: entry.callbacks,
      priority: entry.priority ?? 0,
    });

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;
      this.unregister(entry.layerId, entry.elementId);
    };
  }

  /**
   * Remove a region by layerId + elementId (idempotent).
   *
   * Also clears hover/drag state that pointed at the removed region, so a
   * disappearing element (layer closed, component unmounted) never leaves a
   * stale hover or drag target behind.
   */
  unregister(layerId: string, elementId: string): void {
    const layer = this.regions.get(layerId);
    if (!layer) return;
    layer.delete(elementId);
    if (layer.size === 0) {
      this.regions.delete(layerId);
    }
    if (
      this.hovered &&
      this.hovered.layerId === layerId &&
      this.hovered.elementId === elementId
    ) {
      this.hovered = null;
    }
    if (
      this.drag &&
      this.drag.layerId === layerId &&
      this.drag.elementId === elementId
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
   * - `press`/`drag`/`release` drive the drag lifecycle: a press inside a
   *   region arms a drag capture; the first `drag` event promotes it and
   *   fires `onDragStart`/`onDragMove`; `release` fires `onDragEnd` (only if
   *   a real drag happened — plain clicks stay silent here).
   *
   * @returns `true` if the event was consumed by a registered region,
   *          `false` otherwise.
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
      const region = this.getRegion(hit.layerId, hit.elementId);
      if (region) {
        region.callbacks.onClick?.(event, region.rect);
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
      ? { layerId: hit.layerId, elementId: hit.elementId, dragging: false }
      : null;
    return hit !== null;
  }

  /** Promote armed press to a real drag; fire drag callbacks on the captured target. */
  private processDrag(event: XtermMouseEvent): boolean {
    if (!this.drag) return false;
    const region = this.getRegion(this.drag.layerId, this.drag.elementId);
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
    const region = this.getRegion(drag.layerId, drag.elementId);
    if (region && drag.dragging) {
      region.callbacks.onDragEnd?.(event, region.rect);
    }
    return true;
  }

  /** @returns The currently hovered region, or null. */
  getHovered(): { layerId: string; elementId: string } | null {
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
      hit.elementId === prev.elementId;

    if (prev && !stillHovered) {
      this.getRegion(prev.layerId, prev.elementId)?.callbacks.onLeave?.(event);
      this.hovered = null;
    }

    if (hit && !stillHovered) {
      const region = this.getRegion(hit.layerId, hit.elementId);
      if (region) {
        region.callbacks.onEnter?.(event, region.rect);
        this.hovered = { layerId: hit.layerId, elementId: hit.elementId };
      }
    }

    return hit !== null;
  }

  /**
   * Find the highest-priority region containing the point: modal layers
   * (reverse order) → regular layers (reverse order) → root regions.
   */
  private hitTest(
    x: number,
    y: number,
    layers: KeyboardLayer[],
    modalLayers: KeyboardLayer[],
  ): { layerId: string; elementId: string } | null {
    for (let i = modalLayers.length - 1; i >= 0; i--) {
      const hit = this.hitLayer(modalLayers[i], x, y);
      if (hit) return hit;
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
  ): { layerId: string; elementId: string } | null {
    const layerRegions = this.regions.get(layer.layerId);
    if (!layerRegions) return null;
    const candidates = layer.activeElements.map((elementId, i) => ({
      elementId,
      priority: layerRegions.get(elementId)?.priority ?? 0,
      order: i,
    }));
    return this.hitCandidates(candidates, layer.layerId, layerRegions, x, y);
  }

  private hitRoot(x: number, y: number): { layerId: string; elementId: string } | null {
    const rootRegions = this.regions.get(ROOT_MOUSE_LAYER_ID);
    if (!rootRegions) return null;
    const candidates = [...rootRegions.entries()].map(([elementId, region], i) => ({
      elementId,
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
    candidates: Array<{ elementId: string; priority: number; order: number }>,
    layerId: string,
    layerRegions: Map<string, StoredRegion>,
    x: number,
    y: number,
  ): { layerId: string; elementId: string } | null {
    candidates.sort((a, b) => b.priority - a.priority || b.order - a.order);
    for (const candidate of candidates) {
      const region = layerRegions.get(candidate.elementId);
      if (region && pointInRect(x, y, region.rect)) {
        return { layerId, elementId: candidate.elementId };
      }
    }
    return null;
  }

  private getRegion(
    layerId: string,
    elementId: string,
  ): StoredRegion | undefined {
    return this.regions.get(layerId)?.get(elementId);
  }
}
