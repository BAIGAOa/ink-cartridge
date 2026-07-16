import {
  defaultTargetsSymbol,
  FocusTarget,
  ScreenKeyboardLayer,
} from "../types.js";
import EngineState from "./EngineState.js";

export default class LayerManager<TComponent = unknown> {
  constructor(private state: EngineState<TComponent>) {}

  prevPathRef: TComponent[] = [];
  prevOverlayIdsRef: Set<string> = new Set();
  prevModalIdsRef: Set<string> = new Set();

  cleanLayers() {
    const prev = this.prevPathRef;
    for (const comp of prev) {
      if (!this.state.path.includes(comp)) {
        const layer = this.state.layersRef.get(comp);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        this.state.layersRef.delete(comp);
      }
    }
    this.prevPathRef = this.state.path;
  }

  cleanOverlayLayers() {
    const currentIds = new Set(this.state.displayedOverlays.map((o) => o.id));

    for (const prevId of this.prevOverlayIdsRef) {
      if (!currentIds.has(prevId)) {
        const layer = this.state.layersRef.get(prevId);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        this.state.layersRef.delete(prevId);
      }
    }

    this.prevOverlayIdsRef = currentIds;
  }

  cleanModalLayers() {
    const currentIds = new Set(this.state.displayedModalsRef.map((m) => m.id));

    for (const prevId of this.prevModalIdsRef) {
      if (!currentIds.has(prevId)) {
        const layer = this.state.layersRef.get(prevId);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        this.state.layersRef.delete(prevId);
      }
    }

    this.prevModalIdsRef = currentIds;
  }

  pushOwner(owner: TComponent | string) {
    this.state.ownerStackRef = [...this.state.ownerStackRef, owner];
  }

  popOwner(owner: TComponent | string) {
    const stack = this.state.ownerStackRef;
    const idx = stack.lastIndexOf(owner);
    if (idx !== -1) {
      this.state.ownerStackRef = [
        ...stack.slice(0, idx),
        ...stack.slice(idx + 1),
      ];
    }
  }

  getLayer(owner: TComponent | string) {
    let layer = this.state.layersRef.get(owner);
    if (!layer) {
      let kind: "screen" | "overlay" | "modal" = "screen";
      if (typeof owner === "string") {
        if (this.state.displayedModalsRef.some((m) => m.id === owner)) {
          kind = "modal";
        } else if (this.state.displayedOverlays.some((m) => m.id === owner)) {
          kind = "overlay";
        }
      }

      layer = {
        kind,
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        globalKeyOverrides: new Set(),
        focusTargets: new Map(),
        defaultFocusOrder: [],
        currentFocusId: null,
        actionKeysMap: new Map(),
        sequences: new Map(),
        pendingSequence: null,
      };
      this.state.layersRef.set(owner, layer);
    }
    return layer;
  }

  getCurrentOwner(): TComponent | string | null {
    const stack = this.state.ownerStackRef;
    if (stack.length > 0) return stack[stack.length - 1];
    if (this.state.path.length === 0) return null;
    return this.state.path[this.state.path.length - 1];
  }

  notifyFocusChange() {
    this.state.focusSubscribersRef.forEach((fn) => fn());
  }

  clearPendingSequence(layer: ScreenKeyboardLayer) {
    if (layer.pendingSequence !== null) {
      clearTimeout(layer.pendingSequence.timer);
      layer.pendingSequence = null;
    }
  }

  getOrCreateFocusTarget(
    layer: ScreenKeyboardLayer,
    focusId: string,
    group?: string,
  ): FocusTarget {
    if (group) {
      let g = layer.focusTargets.get(group);
      let initTarget: FocusTarget = {
        bindings: [],
        stoppedKeys: [],
        penetrationKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      if (!g) {
        g = {
          map: new Map<string, FocusTarget>(),
          order: [],
        };

        // Since the group has just been created, there must be no focusId in it.
        g.map.set(focusId, initTarget);
        g.order.push(focusId);
        layer.focusTargets.set(group, g);
      } else {
        let target = g.map.get(focusId);
        if (!target) {
          target = initTarget;

          g.map.set(focusId, target);
          g.order.push(focusId);
        }
      }

      if (layer.currentFocusIds.length === 0) {
        layer.currentFocusIds.push({ fromGroup: group, id: focusId });
        this.notifyFocusChange();
      }

      return initTarget;
    }
    let target = layer.defaultTargets.get(focusId);
    if (!target) {
      target = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        allowedKeys: [],
        actionKeysMap: new Map(),
      };
      layer.defaultTargets.set(focusId, target);
      layer.defaultFocusOrder.push(focusId);
      if (layer.currentFocusIds.length === 0) {
        layer.currentFocusIds.push({
          fromGroup: defaultTargetsSymbol,
          id: focusId,
        });
        this.notifyFocusChange();
      }
    }
    return target;
  }

  readLayer(owner: TComponent | string) {
    return this.state.layersRef.get(owner);
  }

  subscribeFocus(listener: () => void) {
    this.state.focusSubscribersRef.add(listener);
    return () => {
      this.state.focusSubscribersRef.delete(listener);
    };
  }

  focusSet(focusId: string, group?: string) {
    const owner = this.getCurrentOwner();
    if (!owner) return;
    const ownerName =
      typeof owner === "string"
        ? owner
        : (owner as any).displayName || (owner as any).name || "Unknown";
    const layer = this.state.layersRef.get(owner);
    if (!layer) {
      throw new Error(
        `[ink-cartridge] focusSet("${focusId}"): no keyboard layer found for "${ownerName}". ` +
          `Did you forget to wrap the screen in a keyboard provider?`,
      );
    }
    this.clearPendingSequence(layer);

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) {
        throw new Error(
          `[ink-cartridge] focusSet("${focusId}", "${group}"): Focus group ${group} is not registered in layer ${ownerName}. Call methods such as bound Keyboard to register automatically`,
        );
      }

      if (!g.map.has(focusId)) {
        const allFocus =
          g.order.length > 0
            ? g.order.map((each) => `"${each}"`).join(", ")
            : "(none)";

        throw new Error(
          `focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
            `Available targets: ${allFocus}`,
        );
      }

      const has = layer.currentFocusIds.findIndex((each) => {
        return each.fromGroup === group;
      });

      if (has === -1) {
        layer.currentFocusIds.splice(has, 1);
        layer.currentFocusIds.push({ id: focusId, fromGroup: group });
        this.notifyFocusChange();
      }
    } else {
      if (!layer.defaultTargets.has(focusId)) {
        const available =
          layer.defaultFocusOrder.length > 0
            ? layer.defaultFocusOrder.map((id) => `"${id}"`).join(", ")
            : "(none)";

        throw new Error(
          `focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
            `Available targets: ${available}`,
        );
      }

      const idx = layer.currentFocusIds.findIndex((each) => {
        return each.fromGroup === defaultTargetsSymbol;
      });

      if (idx === -1) {
        layer.currentFocusIds.splice(idx, 1);
        layer.currentFocusIds.push({
          id: focusId,
          fromGroup: defaultTargetsSymbol,
        });
        this.notifyFocusChange();
      }
    }
  }

  focusNext(group?: string) {
    const owner = this.getCurrentOwner();
    if (!owner) return;
    const layer = this.state.layersRef.get(owner);
    if (!layer || layer.defaultFocusOrder.length === 0) return;

    this.clearPendingSequence(layer);

    const current = layer.currentFocusId;
    let idx = current ? layer.defaultFocusOrder.indexOf(current) : -1;
    idx = (idx + 1) % layer.defaultFocusOrder.length;
    layer.currentFocusId = layer.defaultFocusOrder[idx];
    this.notifyFocusChange();
  }

  focusPrev(group?: string) {
    const owner = this.getCurrentOwner();
    if (!owner) return;
    const layer = this.state.layersRef.get(owner);
    if (!layer || layer.defaultFocusOrder.length === 0) return;

    this.clearPendingSequence(layer);

    const current = layer.currentFocusId;
    let idx = current ? layer.defaultFocusOrder.indexOf(current) : -1;
    idx = idx <= 0 ? layer.defaultFocusOrder.length - 1 : idx - 1;
    layer.currentFocusId = layer.defaultFocusOrder[idx];
    this.notifyFocusChange();
  }

  focusCurrent(group?: string): string | null {
    const owner = this.getCurrentOwner();
    if (!owner) return null;
    const layer = this.state.layersRef.get(owner);
    return layer?.currentFocusId ?? null;
  }

  focusUnregister(focusId: string, group?: string) {
    const owner = this.getCurrentOwner();
    if (!owner) return;
    const layer = this.state.layersRef.get(owner);
    if (!layer) return;

    const wasFocused = layer.currentFocusId === focusId;
    layer.focusTargets.delete(focusId);
    layer.defaultFocusOrder = layer.defaultFocusOrder.filter(
      (id) => id !== focusId,
    );

    if (wasFocused) {
      layer.currentFocusId =
        layer.defaultFocusOrder.length > 0 ? layer.defaultFocusOrder[0] : null;
      this.notifyFocusChange();
    }
  }
}
