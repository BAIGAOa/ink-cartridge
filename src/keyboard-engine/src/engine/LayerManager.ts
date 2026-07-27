import { defaultTargetsSymbol } from "../types/default-targets-symbol.js";
import { FocusSetOptions, FocusTarget } from "../types/focus.js";
import { KyeboardLayer } from "../types/keyboard-layer.js";
import {
  ElementKeyboard,
  LayerKeyboardLayer,
  PageKeyboardLayer,
} from "../types/page-layer.js";
import EngineState from "./EngineState.js";

export default class LayerManager<TComponent = unknown> {
  constructor(private state: EngineState<TComponent>) {}

  prevPath: TComponent[] = [];
  prevLayers: KyeboardLayer[] = [];
  prevModalLayers: KyeboardLayer[] = [];

  /**
   * Clear the keyboard data layer of a page that no longer exists in the path
   */
  cleanPages() {
    const prev = this.prevPath;
    for (const comp of prev) {
      if (!this.state.synchronizedData.pagePath.includes(comp)) {
        const layer = this.state.pageLayerEelementsKeyboards.get(comp);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        this.state.pageLayerEelementsKeyboards.delete(comp);
      }
    }
    this.prevPath = [...this.state.synchronizedData.pagePath];
  }

  cleanLayers() {
    for (const prevLayer of this.prevLayers) {
      const layerKeyboard = this.state.layersKeyboardMap.get(prevLayer.layerId);
      const layerIndex = this.state.synchronizedData.layers.findIndex(
        (layer) => layer.layerId === prevLayer.layerId,
      );

      if (layerIndex !== -1 && layerKeyboard) {
        for (const element of prevLayer.elements) {
          const layer = this.state.synchronizedData.layers[layerIndex];
          if (!layer.elements.includes(element)) {
            if (layerKeyboard.pendingSequence.fromElementId === element) {
              const timer = layerKeyboard.pendingSequence.pendingSequence.timer;
              clearTimeout(timer);
              layerKeyboard.pendingSequence = {
                fromElementId: null,
                pendingSequence: null,
              };
            }
            layerKeyboard.elementKeyboards.delete(element);
          }
        }
      } else {
        if (layerKeyboard?.pendingSequence.pendingSequence) {
          const timer = layerKeyboard.pendingSequence.pendingSequence.timer;
          clearTimeout(timer);
          layerKeyboard.pendingSequence = {
            fromElementId: null,
            pendingSequence: null,
          };
        }
        this.state.layersKeyboardMap.delete(prevLayer.layerId);
      }
    }

    this.prevLayers = [...this.state.synchronizedData.layers];
  }

  cleanModalLayers() {
    for (const prevModalLayer of this.prevModalLayers) {
      const layerKeyboard = this.state.layersKeyboardMap.get(
        prevModalLayer.layerId,
      );
      const modalLayerIndex = this.state.synchronizedData.modalLayers.findIndex(
        (layer) => layer.layerId === prevModalLayer.layerId,
      );

      if (modalLayerIndex !== -1 && layerKeyboard) {
        for (const element of prevModalLayer.elements) {
          const currentModalLayer =
            this.state.synchronizedData.modalLayers[modalLayerIndex];
          if (!currentModalLayer.elements.includes(element)) {
            if (layerKeyboard.pendingSequence.fromElementId === element) {
              const timer = layerKeyboard.pendingSequence.pendingSequence.timer;
              clearTimeout(timer);
              layerKeyboard.pendingSequence = {
                fromElementId: null,
                pendingSequence: null,
              };
            }
            layerKeyboard.elementKeyboards.delete(element);
          }
        }
      } else {
        if (layerKeyboard?.pendingSequence.pendingSequence) {
          const timer = layerKeyboard.pendingSequence.pendingSequence.timer;
          clearTimeout(timer);
          layerKeyboard.pendingSequence = {
            fromElementId: null,
            pendingSequence: null,
          };
        }
        this.state.layersKeyboardMap.delete(prevModalLayer.layerId);
      }
    }

    this.prevModalLayers = [...this.state.synchronizedData.modalLayers];
  }

  private createKeyboardLayer(): PageKeyboardLayer {
    return {
      bindings: [],
      penetrationKeys: [],
      stoppedKeys: [],
      globalKeyOverrides: new Set(),
      focusTargets: new Map(),
      defaultFocusOrder: [],
      currentFocusIds: [],
      defaultTargets: new Map(),
      actionKeysMap: new Map(),
      sequences: new Map(),
      pendingSequence: null,
    };
  }

  getLayer(screenComponent: TComponent): PageKeyboardLayer;
  getLayer(layerId: string, elementId: string): ElementKeyboard;
  getLayer(
    ownerOrLayer: TComponent | string,
    elementId?: string,
  ): PageKeyboardLayer | ElementKeyboard {
    const state = this.state.synchronizedData;

    // No layers/modals → page layer mode
    if (state.layers.length === 0 && state.modalLayers.length === 0) {
      if (typeof ownerOrLayer === "string") {
        throw new Error(
          "[keyboard-engine] getLayer: string owner requires active layers/modals. " +
            "Use getLayer(component) when no layers exist.",
        );
      }

      let layer = this.state.pageLayerEelementsKeyboards.get(ownerOrLayer);
      if (!layer) {
        layer = this.createKeyboardLayer();
        this.state.pageLayerEelementsKeyboards.set(ownerOrLayer, layer);
      }
      return layer;
    }

    // Layers/modals active → layer keyboard mode
    if (typeof ownerOrLayer !== "string" || !elementId) {
      throw new Error(
        "[keyboard-engine] getLayer: layers/modals are active, call getLayer(layerId, elementId).",
      );
    }

    let layerData = this.state.layersKeyboardMap.get(ownerOrLayer);
    if (!layerData) {
      layerData = {
        layerId: ownerOrLayer,
        pendingSequence: { fromElementId: null, pendingSequence: null },
        elementKeyboards: new Map(),
      };
      this.state.layersKeyboardMap.set(ownerOrLayer, layerData);
    }

    let elementKeyboard = layerData.elementKeyboards.get(elementId);
    if (!elementKeyboard) {
      elementKeyboard = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
        globalKeyOverrides: new Set(),
        focusTargets: new Map(),
        defaultFocusOrder: [],
        currentFocusIds: [],
        defaultTargets: new Map(),
        actionKeysMap: new Map(),
        sequences: new Map(),
        associatedLayer: ownerOrLayer,
        allowedKeys: [],
      };
      layerData.elementKeyboards.set(elementId, elementKeyboard);
    }
    return elementKeyboard;
  }

  /**
   * Used to get the current page
   * This method will be used for graceful fallback of
   * the binding method and to ensure that the page level binding
   * remains stable even after the layer is present
   */
  getTopPage() {
    const data = this.state.synchronizedData;
    if (data.pagePath.length === 0) return null;
    return data.pagePath[data.pagePath.length - 1];
  }

  getCurrentOwner(): TComponent | string | null {
    const data = this.state.synchronizedData;
    if (data.modalLayers.length > 0) {
      return data.modalLayers[data.modalLayers.length - 1].layerId;
    }
    if (data.layers.length > 0) {
      return data.layers[data.layers.length - 1].layerId;
    }
    if (data.pagePath.length === 0) return null;
    return data.pagePath[data.pagePath.length - 1];
  }

  notifyFocusChange() {
    this.state.focusSubscribersRef.forEach((fn) => fn());
  }

  clearPendingSequence(layer: PageKeyboardLayer | ElementKeyboard) {
    if ("associatedLayer" in layer) {
      const from = this.state.layersKeyboardMap.get(layer.associatedLayer);
      if (from?.pendingSequence.pendingSequence) {
        const timer = from.pendingSequence.pendingSequence.timer;
        clearTimeout(timer);
        from.pendingSequence = {
          fromElementId: null,
          pendingSequence: null,
        };
      }
    } else {
      if (layer.pendingSequence) {
        const timer = layer.pendingSequence.timer;
        clearTimeout(timer);
        layer.pendingSequence = null;
      }
    }
  }

  getOrCreateFocusTarget(
    layer: PageKeyboardLayer | ElementKeyboard,
    focusId: string,
    group?: string,
  ): FocusTarget {
    if (group && typeof group === "string") {
      let g = layer.focusTargets.get(group);

      if (!g) {
        const target: FocusTarget = {
          bindings: [],
          stoppedKeys: [],
          penetrationKeys: [],
          actionKeysMap: new Map(),
        };

        g = {
          map: new Map([[focusId, target]]),
          order: [focusId],
        };
        layer.focusTargets.set(group, g);

        if (layer.currentFocusIds.length === 0) {
          layer.currentFocusIds.push({ fromGroup: group, id: focusId });
          this.notifyFocusChange();
        }

        return target;
      }

      let target = g.map.get(focusId);
      if (!target) {
        target = {
          bindings: [],
          stoppedKeys: [],
          penetrationKeys: [],
          actionKeysMap: new Map(),
        };

        g.map.set(focusId, target);
        g.order.push(focusId);
      }

      if (layer.currentFocusIds.length === 0) {
        layer.currentFocusIds.push({ fromGroup: group, id: focusId });
        this.notifyFocusChange();
      }

      return target;
    }
    let target = layer.defaultTargets.get(focusId);
    if (!target) {
      target = {
        bindings: [],
        penetrationKeys: [],
        stoppedKeys: [],
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

  readLayer(screenComponent: TComponent): PageKeyboardLayer | undefined;
  readLayer(layerId: string): LayerKeyboardLayer | undefined;
  readLayer(layerId: string, elementId: string): ElementKeyboard | undefined;
  readLayer(
    ownerOrLayer: TComponent | string,
    elementId?: string,
  ): PageKeyboardLayer | LayerKeyboardLayer | ElementKeyboard | undefined {
    if (typeof ownerOrLayer !== "string") {
      return this.state.pageLayerEelementsKeyboards.get(ownerOrLayer);
    }
    if (elementId) {
      return this.state.layersKeyboardMap
        .get(ownerOrLayer)
        ?.elementKeyboards.get(elementId);
    }
    return this.state.layersKeyboardMap.get(ownerOrLayer);
  }

  subscribeFocus(listener: () => void) {
    this.state.focusSubscribersRef.add(listener);
    return () => {
      this.state.focusSubscribersRef.delete(listener);
    };
  }

  private getAllFocus(order: string[]) {
    return order.length > 0
      ? order.map((each) => `"${each}"`).join(", ")
      : "(none)";
  }

  private resolveKeyboardLayer(
    owner: TComponent | string,
    element?: string,
  ): { layer: PageKeyboardLayer | ElementKeyboard; name: string } {
    if (typeof owner !== "string") {
      const layer = this.state.pageLayerEelementsKeyboards.get(owner);
      const name =
        (owner as any).displayName || (owner as any).name || "Unknown";
      if (!layer) {
        throw new Error(
          `[keyboard-engine] no keyboard layer found for "${name}". ` +
            "Did you forget to wrap the screen in a keyboard provider?",
        );
      }
      return { layer, name: name };
    }

    const elementId = element;
    if (!elementId) {
      throw new Error(
        `[keyboard-engine] owner "${owner}" is a layer ID, but no element was specified. ` +
          'Pass { element: "elementId" } to focusSet options.',
      );
    }

    const layer = this.state.layersKeyboardMap
      .get(owner)
      ?.elementKeyboards.get(elementId);
    if (!layer) {
      throw new Error(
        `[keyboard-engine] no keyboard layer found for layer "${owner}" element "${elementId}". ` +
          "Did you forget to call boundKeyboard for this element?",
      );
    }
    return { layer, name: `${owner}/${elementId}` };
  }

  focusSet(focusId: string, group?: string): void;
  focusSet(focusId: string, options?: FocusSetOptions): void;
  focusSet(focusId: string, groupOrOptions?: string | FocusSetOptions): void {
    const owner = this.getCurrentOwner();
    if (!owner) return;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    const { layer, name: ownerName } = this.resolveKeyboardLayer(
      owner,
      element,
    );
    this.clearPendingSequence(layer);

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) {
        throw new Error(
          `[keyboard-engine] focusSet("${focusId}", "${group}"): Focus group ${group} is not registered in layer ${ownerName}. Call methods such as boundKeyboard to register automatically`,
        );
      }

      if (!g.map.has(focusId)) {
        const allFocus = this.getAllFocus(g.order);
        throw new Error(
          `[keyboard-engine] focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
            `Available targets: ${allFocus}`,
        );
      }

      const has = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );
      if (has !== -1) {
        layer.currentFocusIds.splice(has, 1);
      }
      layer.currentFocusIds.push({ id: focusId, fromGroup: group });
      this.notifyFocusChange();
    } else {
      if (!layer.defaultTargets.has(focusId)) {
        const available = this.getAllFocus(layer.defaultFocusOrder);
        throw new Error(
          `[keyboard-engine] focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
            `Available targets: ${available}`,
        );
      }

      const idx = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === defaultTargetsSymbol,
      );
      if (idx !== -1) {
        layer.currentFocusIds.splice(idx, 1);
      }
      layer.currentFocusIds.push({
        id: focusId,
        fromGroup: defaultTargetsSymbol,
      });
      this.notifyFocusChange();
    }
  }

  private replaceFocusGroup(
    inCurrentGroupId: string,
    order: string[],
    currentFocusIds: {
      id: string;
      fromGroup: string | typeof defaultTargetsSymbol;
    }[],
    idx: number,
    group: string | null,
    next: boolean,
  ) {
    let inOrderIndex = order.indexOf(inCurrentGroupId);
    inOrderIndex = next
      ? (inOrderIndex + 1) % order.length
      : (inOrderIndex - 1 + order.length) % order.length;

    const result = order[inOrderIndex];
    currentFocusIds.splice(idx, 1);
    currentFocusIds.push({
      id: result,
      fromGroup: group ?? defaultTargetsSymbol,
    });
  }

  focusNext(group?: string): void;
  focusNext(options?: FocusSetOptions): void;
  focusNext(groupOrOptions?: string | FocusSetOptions): void {
    const owner = this.getCurrentOwner();
    if (!owner) return;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    const { layer } = this.resolveKeyboardLayer(owner, element);
    this.clearPendingSequence(layer);

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) {
        throw new Error(
          `[keyboard-engine] focusNext("${group}"): Focus group ${group} is not registered. Call methods such as boundKeyboard to register automatically`,
        );
      }

      const idx = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );

      if (idx !== -1) {
        const inCurrentGroup = layer.currentFocusIds[idx];
        this.replaceFocusGroup(
          inCurrentGroup.id,
          g.order,
          layer.currentFocusIds,
          idx,
          group,
          true,
        );
        this.notifyFocusChange();
      }
    } else {
      const currents = layer.currentFocusIds;
      const index = currents.findIndex(
        (each) => each.fromGroup === defaultTargetsSymbol,
      );

      if (index !== -1) {
        const inCurrentGroup = currents[index];
        this.replaceFocusGroup(
          inCurrentGroup.id,
          layer.defaultFocusOrder,
          layer.currentFocusIds,
          index,
          null,
          true,
        );
        this.notifyFocusChange();
      }
    }
  }

  focusPrev(group?: string): void;
  focusPrev(options?: FocusSetOptions): void;
  focusPrev(groupOrOptions?: string | FocusSetOptions): void {
    const owner = this.getCurrentOwner();
    if (!owner) return;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    const { layer } = this.resolveKeyboardLayer(owner, element);
    this.clearPendingSequence(layer);

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) {
        throw new Error(
          `[keyboard-engine] focusPrev("${group}"): Focus group ${group} is not registered. Call methods such as boundKeyboard to register automatically`,
        );
      }

      const idx = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );

      if (idx !== -1) {
        const inCurrentGroup = layer.currentFocusIds[idx];
        this.replaceFocusGroup(
          inCurrentGroup.id,
          g.order,
          layer.currentFocusIds,
          idx,
          group,
          false,
        );
        this.notifyFocusChange();
      }
    } else {
      const currents = layer.currentFocusIds;
      const index = currents.findIndex(
        (each) => each.fromGroup === defaultTargetsSymbol,
      );

      if (index !== -1) {
        const inCurrentGroup = currents[index];
        this.replaceFocusGroup(
          inCurrentGroup.id,
          layer.defaultFocusOrder,
          layer.currentFocusIds,
          index,
          null,
          false,
        );
        this.notifyFocusChange();
      }
    }
  }

  focusCurrent(group?: string): {
    noOwner?: boolean;
    noLayer?: boolean;
    noFound?: boolean;
    result?: { id: string; fromGroup: string | typeof defaultTargetsSymbol };
  };
  focusCurrent(options?: FocusSetOptions): {
    noOwner?: boolean;
    noLayer?: boolean;
    noFound?: boolean;
    result?: { id: string; fromGroup: string | typeof defaultTargetsSymbol };
  };
  focusCurrent(groupOrOptions?: string | FocusSetOptions): {
    noOwner?: boolean;
    noLayer?: boolean;
    noFound?: boolean;
    result?: { id: string; fromGroup: string | typeof defaultTargetsSymbol };
  } {
    const owner = this.getCurrentOwner();
    if (!owner) {
      return { noOwner: true };
    }

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    let layer: PageKeyboardLayer | ElementKeyboard;
    try {
      layer = this.resolveKeyboardLayer(owner, element).layer;
    } catch {
      return { noLayer: true };
    }

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) {
        throw new Error(
          `[keyboard-engine] focusCurrent(${group}): The focus group passed to the current method is not registered. ` +
            "Please call methods such as boundKeyboard, which handle registration automatically.",
        );
      }

      const index = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );

      if (index === -1) {
        return { noFound: true };
      }
      return { result: layer.currentFocusIds[index] };
    }

    const index = layer.currentFocusIds.findIndex(
      (each) => each.fromGroup === defaultTargetsSymbol,
    );

    if (index === -1) {
      return { noFound: true };
    }
    return { result: layer.currentFocusIds[index] };
  }

  focusUnregister(focusId: string, group?: string): void;
  focusUnregister(focusId: string, options?: FocusSetOptions): void;
  focusUnregister(
    focusId: string,
    groupOrOptions?: string | FocusSetOptions,
  ): void {
    const owner = this.getCurrentOwner();
    if (!owner) return;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    let layer: PageKeyboardLayer | ElementKeyboard;
    try {
      layer = this.resolveKeyboardLayer(owner, element).layer;
    } catch {
      return;
    }

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) return;

      const target = g.map.get(focusId);
      if (!target) return;

      const index = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group && each.id === focusId,
      );
      const wasFocused = index !== -1;

      g.map.delete(focusId);
      g.order = g.order.filter((id) => id !== focusId);

      if (wasFocused) {
        layer.currentFocusIds.splice(index, 1);
        const result = g.order.length > 0 ? g.order[0] : null;
        if (result) {
          layer.currentFocusIds.push({
            id: result,
            fromGroup: group,
          });
        }
        this.notifyFocusChange();
      }
    } else {
      const target = layer.defaultTargets.get(focusId);
      if (!target) return;

      const index = layer.currentFocusIds.findIndex(
        (each) =>
          each.fromGroup === defaultTargetsSymbol && each.id === focusId,
      );
      const wasFocused = index !== -1;

      layer.defaultTargets.delete(focusId);
      layer.defaultFocusOrder = layer.defaultFocusOrder.filter(
        (each) => each !== focusId,
      );

      if (wasFocused) {
        layer.currentFocusIds.splice(index, 1);
        const result =
          layer.defaultFocusOrder.length > 0
            ? layer.defaultFocusOrder[0]
            : null;
        if (result) {
          layer.currentFocusIds.push({
            id: result,
            fromGroup: defaultTargetsSymbol,
          });
        }
        this.notifyFocusChange();
      }
    }
  }

  activateFocusGroup(focusId: string, group?: string): boolean;
  activateFocusGroup(focusId: string, options?: FocusSetOptions): boolean;
  activateFocusGroup(
    focusId: string,
    groupOrOptions?: string | FocusSetOptions,
  ): boolean {
    const owner = this.getCurrentOwner();
    if (!owner) return false;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    let layer: PageKeyboardLayer | ElementKeyboard;
    try {
      layer = this.resolveKeyboardLayer(owner, element).layer;
    } catch {
      return false;
    }

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) return false;

      const target = g.map.get(focusId);
      if (!target) return false;

      const inCurrentIndex = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );

      if (inCurrentIndex === -1) {
        layer.currentFocusIds.push({
          id: focusId,
          fromGroup: group,
        });
        this.notifyFocusChange();
        return true;
      }
      return false;
    }

    const target = layer.defaultTargets.get(focusId);
    if (!target) return false;

    const inCurrentIndex = layer.currentFocusIds.findIndex(
      (each) => each.fromGroup === defaultTargetsSymbol,
    );

    if (inCurrentIndex === -1) {
      layer.currentFocusIds.push({
        id: focusId,
        fromGroup: defaultTargetsSymbol,
      });
      this.notifyFocusChange();
      return true;
    }
    return false;
  }

  kickFocusGroup(group?: string): boolean;
  kickFocusGroup(options?: FocusSetOptions): boolean;
  kickFocusGroup(groupOrOptions?: string | FocusSetOptions): boolean {
    const owner = this.getCurrentOwner();
    if (!owner) return false;

    const group =
      typeof groupOrOptions === "string"
        ? groupOrOptions
        : groupOrOptions?.group;
    const element =
      typeof groupOrOptions !== "string" ? groupOrOptions?.element : undefined;

    let layer: PageKeyboardLayer | ElementKeyboard;
    try {
      layer = this.resolveKeyboardLayer(owner, element).layer;
    } catch {
      return false;
    }

    if (group) {
      const g = layer.focusTargets.get(group);
      if (!g) return false;

      const inCurrentIndex = layer.currentFocusIds.findIndex(
        (each) => each.fromGroup === group,
      );

      if (inCurrentIndex !== -1) {
        layer.currentFocusIds.splice(inCurrentIndex, 1);
        this.notifyFocusChange();
        return true;
      }
      return false;
    }

    const defaultInCurrentIndex = layer.currentFocusIds.findIndex(
      (each) => each.fromGroup === defaultTargetsSymbol,
    );

    if (defaultInCurrentIndex !== -1) {
      layer.currentFocusIds.splice(defaultInCurrentIndex, 1);
      this.notifyFocusChange();
      return true;
    }
    return false;
  }
}
