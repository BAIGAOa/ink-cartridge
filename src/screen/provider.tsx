import React, { useReducer, useMemo, useEffect, ReactNode } from "react";
import { ScreenSystemContext, ScreenSystemContextValue } from "./context.js";
import { getTemplate, hasComponent, isChildOf, getParent } from "./registry.js";
import { ScreenAction } from "./types/actions.js";
import { BackFn, GotoScreenFn, SkipFn, SkipOptions } from "./types.js";
import {
  ActivateElementFn,
  ActivateElementInModalLayerFn,
  ApplyElementFn,
  ApplyElementToModalLayerFn,
  CloseAllLayerFn,
  CloseAllModalLayerFn,
  CloseLayerFn,
  CloseModalLayerFn,
  DeactivateElementFn,
  DeactivateElementInModalLayerFn,
  EraseElementFn,
  EraseElementInModalLayerFn,
  Layer,
  LayerOptions,
  ModalLayer,
  ModalLayerOptions,
  OpenLayerFn,
  OpenModalLayerFn,
} from "./types/layer.js";
import { LayerElement } from "./types/element.js";
import { LayerElementInput } from "./types/element.js";
import { ScreenState } from "./types/state.js";

const _dispatchers = new Set<React.Dispatch<ScreenAction>>();

/**
 * Dev-only console warning. Reducer diagnostics are no-ops in production
 * builds; the duplicate open/close no-op itself must not be silenced.
 */
function warnInDev(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message);
  }
}

/**
 * Clear all registered provider dispatchers.
 * Intended for test cleanup — prevents stale dispatch references
 * from leaking between test runs when providers are not properly
 * unmounted.
 */
export function clearDispatchers(): void {
  _dispatchers.clear();
}

function getDispatch(): React.Dispatch<ScreenAction> {
  if (_dispatchers.size === 0) {
    throw new Error(
      "[Ink-Cartridge] Navigation function called before Provider is mounted. Please ensure <ScenarioManagementProvider> is mounted in the component tree.",
    );
  }
  return [..._dispatchers][_dispatchers.size - 1];
}

/**
 * Narrow a type-safe `LayerElementInput<C>` (props typed as `ComponentProps<C>`)
 * to the stored `LayerElement` shape (props as a plain record). The call-site
 * type safety mirrors `skip()`'s `params`; storage stays framework-agnostic.
 */
function toStoredLayerElement<C extends React.ComponentType<any>>(
  input: LayerElementInput<C>,
): LayerElement {
  return {
    elementId: input.elementId,
    element: input.element,
    active: input.active,
    props: input.props as Record<string, unknown> | undefined,
  };
}

function sortLayers<T extends Layer | ModalLayer>(layers: T[]): T[] {
  return [...layers].sort((a, b) => {
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Navigate down the tree to a direct child of the current screen.
 */
export function skip<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions,
): void {
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Cartridge] Component "${
        component.displayName || component.name || "anonymous"
      }" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: "skip",
    component,
    params: params as Record<string, unknown>,
    onlyAttribute: options?.onlyAttribute ?? false,
  });
}

/**
 * Navigate up the tree to the parent of the current screen.
 */
export function back(levels: number = 1): void {
  if (levels < 1) {
    throw new Error("[Ink-Cartridge] back() levels must be >= 1.");
  }
  getDispatch()({ type: "back", levels });
}

/**
 * Jump to any registered screen across branches of the tree.
 */
export function gotoScreen<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
): void {
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Cartridge] Component "${
        component.displayName || component.name || "anonymous"
      }" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: "gotoScreen",
    component,
    params: params as Record<string, unknown>,
  });
}

/**
 * Open a new layer with a unique ID and z-index.
 */
export function openLayer(
  layerId: string,
  zIndex: number,
  options?: LayerOptions,
): void {
  getDispatch()({ type: "openLayer", layerId, zIndex, options });
}

/**
 * Apply an element to a registered layer.
 *
 * `props` is type-checked against the element component's own prop type —
 * the same type-safety pattern `skip()` uses for `params`.
 */
export function applyElement<C extends React.ComponentType<any>>(
  targetLayerId: string,
  layerElement: LayerElementInput<C>,
): void {
  getDispatch()({
    type: "applyElement",
    targetLayerId,
    layerElement: toStoredLayerElement(layerElement),
  });
}

/**
 * Close a registered layer by its ID.
 */
export function closeLayer(targetLayerId: string): void {
  getDispatch()({ type: "closeLayer", targetLayerId });
}

/**
 * Remove an element from a registered layer.
 */
export function eraseElement(
  targetLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({ type: "eraseElement", targetLayerId, targetElementId });
}

/**
 * Close all layers at once.
 */
export function closeAllLayer(): void {
  getDispatch()({ type: "closeAllLayer" });
}

export function openModalLayer(
  layerId: string,
  zIndex: number,
  options?: ModalLayerOptions,
): void {
  getDispatch()({ type: "openModalLayer", layerId, zIndex, options });
}

export function applyElementToModalLayer<C extends React.ComponentType<any>>(
  targetModalLayerId: string,
  modalLayerElement: LayerElementInput<C>,
): void {
  getDispatch()({
    type: "applyElementToModalLayer",
    targetModalLayerId,
    modalLayerElement: toStoredLayerElement(modalLayerElement),
  });
}

export function closeModalLayer(targetModalLayerId: string): void {
  getDispatch()({ type: "closeModalLayer", targetModalLayerId });
}

export function eraseElementInModalLayer(
  targetModalLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({
    type: "eraseElementInModalLayer",
    targetModalLayerId,
    targetElementId,
  });
}

export function closeAllModalLayer(): void {
  getDispatch()({ type: "closeAllModalLayer" });
}

/**
 * Activate a previously deactivated element on a registered layer.
 * The element stays mounted — only its keyboard-active flag is set to `true`,
 * so the keyboard engine resumes dispatching key events to its bindings.
 */
export function activateElement(
  targetLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({ type: "activateElement", targetLayerId, targetElementId });
}

/**
 * Deactivate an element on a registered layer.
 * The element stays mounted — only its keyboard-active flag is set to `false`,
 * so the keyboard engine stops dispatching key events to its bindings while
 * keeping all registration data intact for a later reactivation.
 */
export function deactivateElement(
  targetLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({ type: "deactivateElement", targetLayerId, targetElementId });
}

/**
 * Modal-layer counterpart of {@link activateElement}.
 */
export function activateElementInModalLayer(
  targetModalLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({
    type: "activateElementInModalLayer",
    targetModalLayerId,
    targetElementId,
  });
}

/**
 * Modal-layer counterpart of {@link deactivateElement}.
 */
export function deactivateElementInModalLayer(
  targetModalLayerId: string,
  targetElementId: string,
): void {
  getDispatch()({
    type: "deactivateElementInModalLayer",
    targetModalLayerId,
    targetElementId,
  });
}

/**
 * 从树中查找共同祖先
 * 从 currentPath 栈底向上找到第一个在 targetAncestors 中的节点
 */
function findCommonAncestor(
  currentPath: React.ComponentType<any>[],
  target: React.ComponentType<any>,
): React.ComponentType<any> {
  const targetAncestors = new Set<React.ComponentType<any>>();
  let node: React.ComponentType<any> | null | undefined = target;
  while (node) {
    targetAncestors.add(node);
    node = getParent(node);
  }

  for (let i = currentPath.length - 1; i >= 0; i--) {
    if (targetAncestors.has(currentPath[i])) {
      return currentPath[i];
    }
  }

  throw new Error(
    `[Ink-Cartridge] Cannot find common ancestor. The target component may not be in the same tree.`,
  );
}

/**
 * 构建从祖先到目标节点的路径（不含祖先本身）
 */
function buildPathFrom(
  ancestor: React.ComponentType<any>,
  target: React.ComponentType<any>,
): React.ComponentType<any>[] {
  const path: React.ComponentType<any>[] = [];
  let node: React.ComponentType<any> | null | undefined = target;
  while (node && node !== ancestor) {
    path.push(node);
    node = getParent(node);
  }
  if (!node) {
    throw new Error(
      `[Ink-Cartridge] Target component is not a descendant of the ancestor.`,
    );
  }
  path.reverse();
  return path;
}

/**
 * Pure reducer for {@link ScreenState}.
 *
 * Handles all navigation actions: skip (down), back (up), gotoScreen
 * (cross-branch), openLayer/closeLayer/applyElement/eraseElement,
 * openModalLayer/closeModalLayer/applyElementToModalLayer/eraseElementInModalLayer,
 * activate/deactive element variants, and closeAllLayer/closeAllModalLayer.
 *
 * Navigation actions filter out non-persistent layers and modal layers
 * (crossPage: false) and recalculate active state for persistent entries.
 */
function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {
    case "skip": {
      const current = state.path[state.path.length - 1];

      if (!isChildOf(action.component, current)) {
        throw new Error(
          `[Ink-Cartridge] "${
            action.component.displayName || action.component.name || "anonymous"
          }" is not a child of "${
            current.displayName || current.name || "anonymous"
          }". Use skip to navigate down the tree, or gotoScreen to jump across branches.`,
        );
      }

      const sameComponent = action.component === current;
      const counter =
        sameComponent && action.onlyAttribute
          ? state.counter
          : state.counter + 1;

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      const newPath = [...state.path, action.component];

      const crossPageLayers = state.allLayers.filter(
        (each) => each.crossPage === true,
      );

      const crossPageModalLayers = state.allModalLayers.filter(
        (each) => each.crossPage === true,
      );

      return {
        path: newPath,
        pathParams: [...state.pathParams, mergedParams],
        counter,
        allLayers: crossPageLayers,
        allModalLayers: crossPageModalLayers,
      };
    }

    case "back": {
      const levels = action.levels ?? 1;

      if (state.path.length <= levels) {
        throw new Error(
          levels === 1
            ? "[Ink-Cartridge] back() failed: already at the root node, cannot go back."
            : `[Ink-Cartridge] back(${levels}) failed: current depth is ${state.path.length}, cannot go back ${levels} levels.`,
        );
      }

      const newPath = state.path.slice(0, -levels);

      const crossPageLayers = state.allLayers.filter(
        (each) => each.crossPage === true,
      );

      const crossPageModalLayers = state.allModalLayers.filter(
        (each) => each.crossPage === true,
      );

      return {
        path: newPath,
        pathParams: state.pathParams.slice(0, -levels),
        counter: state.counter + 1,
        allLayers: crossPageLayers,
        allModalLayers: crossPageModalLayers,
      };
    }

    case "gotoScreen": {
      const commonAncestor = findCommonAncestor(state.path, action.component);
      const ancestorIndex = state.path.indexOf(commonAncestor);

      if (ancestorIndex === -1) {
        throw new Error(
          `[Ink-Cartridge] gotoScreen failed: cannot locate common ancestor.`,
        );
      }

      const suffix = buildPathFrom(commonAncestor, action.component);
      const newPath = [...state.path.slice(0, ancestorIndex + 1), ...suffix];

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      const newPathParams = [
        ...state.pathParams.slice(0, ancestorIndex + 1),
        ...suffix.map((comp) => {
          const tpl = getTemplate(comp) ?? {};
          return comp === action.component ? mergedParams : tpl;
        }),
      ];

      const crossPageLayers = state.allLayers.filter(
        (each) => each.crossPage === true,
      );
      const crossPageModalLayers = state.allModalLayers.filter(
        (each) => each.crossPage === true,
      );
      return {
        path: newPath,
        pathParams: newPathParams,
        counter: state.counter + 1,
        allLayers: crossPageLayers,
        allModalLayers: crossPageModalLayers,
      };
    }

    case "openLayer": {
      // A key handler can re-fire before the layer it opened has mounted
      // (its keyboard bindings register in a later effect), or a repeated
      // key can bubble back to the host page while the layer is still open.
      // Re-opening an existing ID is a user race, not a bug — treat it as a
      // no-op instead of crashing the app from inside a reducer.
      if (state.allLayers.some((each) => each.layerId === action.layerId)) {
        warnInDev(
          `[ink-cartridge] openLayer("${action.layerId}") ignored: the ID is already registered. Duplicate opens are no-ops; close the layer first to reopen it.`,
        );
        return state;
      }
      if (
        state.allModalLayers.some((each) => each.layerId === action.layerId)
      ) {
        throw new Error(
          `
          [ink-cartridge] Layer ID "${action.layerId}" is already used by a modal layer. Modal layers and normal layers share the ID namespace in the keyboard engine, so reuse across the two is not allowed.
          `,
        );
      }

      const newLayer: Layer = {
        layerId: action.layerId,
        zIndex: action.zIndex,
        elements: new Map(),
        crossPage: action.options?.crossPage ?? false,
        // Use the current timestamp as the creation time to ensure no errors occur,
        // even if the z-index values are identical.
        createdAt: Date.now(),
        automaticTakeoverKeyboard:
          action.options?.automaticTakeoverKeyboard ?? false,
        hostPage: state.path[state.path.length - 1] ?? null,
      };

      const newLayers = sortLayers([...state.allLayers, newLayer]);

      return {
        ...state,
        allLayers: newLayers,
      };
    }

    case "applyElement": {
      const targetLayerIndex = state.allLayers.findIndex(
        (each) => each.layerId === action.targetLayerId,
      );

      if (targetLayerIndex === -1) {
        throw new Error(
          `
          [ink-cartridge] The target ${action.targetLayerId} you entered has not been registered.

          Try calling the openLayer method.
          For example:
          const { openLayer } = useScreenSystem()

          openLayer(${action.targetLayerId}, 1)
          `,
        );
      }

      const targetLayer = state.allLayers[targetLayerIndex];

      // Part of the same key-mash race as openLayer: the re-fired handler
      // re-applies the element right after the duplicate open is ignored.
      if (targetLayer.elements.has(action.layerElement.elementId)) {
        warnInDev(
          `[ink-cartridge] applyElement("${action.layerElement.elementId}" on "${targetLayer.layerId}") ignored: the element ID is already applied. Duplicate applies are no-ops; erase the element first to re-apply it.`,
        );
        return state;
      }

      const newElements = new Map(targetLayer.elements);
      newElements.set(action.layerElement.elementId, action.layerElement);

      const newAllLayers = [...state.allLayers];
      newAllLayers[targetLayerIndex] = {
        ...targetLayer,
        elements: newElements,
      };

      return {
        ...state,
        allLayers: newAllLayers,
      };
    }

    case "closeLayer": {
      const targetLayerIndex = state.allLayers.findIndex(
        (each) => each.layerId === action.targetLayerId,
      );
      // Mirror of the openLayer race: a second close dispatched before the
      // layer's binding cleanup ran would otherwise throw mid-render.
      if (targetLayerIndex === -1) {
        warnInDev(
          `[ink-cartridge] closeLayer("${action.targetLayerId}") ignored: no layer with this ID is registered. Duplicate closes are no-ops.`,
        );
        return state;
      }

      const remainingLayers = state.allLayers.filter(
        (_, idx) => idx !== targetLayerIndex,
      );
      const newLayers = sortLayers(remainingLayers);

      return {
        ...state,
        allLayers: newLayers,
      };
    }

    case "eraseElement": {
      const targetLayerIndex = state.allLayers.findIndex(
        (each) => each.layerId === action.targetLayerId,
      );

      if (targetLayerIndex === -1) {
        throw new Error(
          `
          [ink-cartridge] The layer ${action.targetLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `,
        );
      }

      const targetLayer = state.allLayers[targetLayerIndex];

      // Mirror of the applyElement race: a second erase dispatched before
      // the element's binding cleanup ran must not crash the app.
      if (!targetLayer.elements.has(action.targetElementId)) {
        warnInDev(
          `[ink-cartridge] eraseElement("${action.targetElementId}" from "${action.targetLayerId}") ignored: no element with this ID is applied. Duplicate erases are no-ops.`,
        );
        return state;
      }

      const newElements = new Map(targetLayer.elements);
      newElements.delete(action.targetElementId);

      const newAllLayers = [...state.allLayers];
      newAllLayers[targetLayerIndex] = {
        ...targetLayer,
        elements: newElements,
      };

      return {
        ...state,
        allLayers: newAllLayers,
      };
    }

    case "closeAllLayer": {
      return {
        ...state,
        allLayers: [],
      };
    }

    case "activateElement": {
      const targetLayerIndex = state.allLayers.findIndex(
        (each) => each.layerId === action.targetLayerId,
      );
      if (targetLayerIndex === -1) {
        throw new Error(
          `[ink-cartridge] activateElement: layer "${action.targetLayerId}" is not registered.`,
        );
      }
      const targetLayer = state.allLayers[targetLayerIndex];
      const targetElement = targetLayer.elements.get(action.targetElementId);
      if (!targetElement) {
        throw new Error(
          `[ink-cartridge] activateElement: element "${action.targetElementId}" does not exist on layer "${action.targetLayerId}".`,
        );
      }
      if (targetElement.active !== false) return state;

      const newElements = new Map(targetLayer.elements);
      newElements.set(action.targetElementId, {
        ...targetElement,
        active: true,
      });
      const newAllLayers = [...state.allLayers];
      newAllLayers[targetLayerIndex] = {
        ...targetLayer,
        elements: newElements,
      };
      return { ...state, allLayers: newAllLayers };
    }

    case "deactivateElement": {
      const targetLayerIndex = state.allLayers.findIndex(
        (each) => each.layerId === action.targetLayerId,
      );
      if (targetLayerIndex === -1) {
        throw new Error(
          `[ink-cartridge] deactivateElement: layer "${action.targetLayerId}" is not registered.`,
        );
      }
      const targetLayer = state.allLayers[targetLayerIndex];
      const targetElement = targetLayer.elements.get(action.targetElementId);
      if (!targetElement) {
        throw new Error(
          `[ink-cartridge] deactivateElement: element "${action.targetElementId}" does not exist on layer "${action.targetLayerId}".`,
        );
      }
      if (targetElement.active === false) return state;

      const newElements = new Map(targetLayer.elements);
      newElements.set(action.targetElementId, {
        ...targetElement,
        active: false,
      });
      const newAllLayers = [...state.allLayers];
      newAllLayers[targetLayerIndex] = {
        ...targetLayer,
        elements: newElements,
      };
      return { ...state, allLayers: newAllLayers };
    }

    case "openModalLayer": {
      // Same user-race no-op as openLayer: a repeated key can re-open an
      // existing modal layer before its bindings are live.
      if (
        state.allModalLayers.some((each) => each.layerId === action.layerId)
      ) {
        warnInDev(
          `[ink-cartridge] openModalLayer("${action.layerId}") ignored: the ID is already registered. Duplicate opens are no-ops; close the modal layer first to reopen it.`,
        );
        return state;
      }
      if (state.allLayers.some((each) => each.layerId === action.layerId)) {
        throw new Error(
          `
          [ink-cartridge] Modal layer ID "${action.layerId}" is already used by a normal layer. Modal layers and normal layers share the ID namespace in the keyboard engine, so reuse across the two is not allowed.
          `,
        );
      }

      const newModalLayer: ModalLayer = {
        layerId: action.layerId,
        zIndex: action.zIndex,
        elements: new Map(),
        crossPage: action.options?.crossPage ?? false,
        // Use the current timestamp as the creation time to ensure no errors occur,
        // even if the z-index values are identical.
        createdAt: Date.now(),
        automaticTakeoverKeyboard:
          action.options?.automaticTakeoverKeyboard ?? false,
        hostPage: state.path[state.path.length - 1] ?? null,
      };

      const newModalLayers = sortLayers([
        ...state.allModalLayers,
        newModalLayer,
      ]);

      return {
        ...state,
        allModalLayers: newModalLayers,
      };
    }

    case "applyElementToModalLayer": {
      const targetModalLayerIndex = state.allModalLayers.findIndex(
        (each) => each.layerId === action.targetModalLayerId,
      );

      if (targetModalLayerIndex === -1) {
        throw new Error(
          `
          [ink-cartridge] The target modal layer ${action.targetModalLayerId} you entered has not been registered.

          Try calling the openModalLayer method.
          For example:
          const { openModalLayer } = useScreenSystem()

          openModalLayer(${action.targetModalLayerId}, 1)
          `,
        );
      }

      const targetModalLayer = state.allModalLayers[targetModalLayerIndex];

      // Mirror of the applyElement no-op for the same key-mash race.
      if (targetModalLayer.elements.has(action.modalLayerElement.elementId)) {
        warnInDev(
          `[ink-cartridge] applyElementToModalLayer("${action.modalLayerElement.elementId}" on "${targetModalLayer.layerId}") ignored: the element ID is already applied. Duplicate applies are no-ops; erase the element first to re-apply it.`,
        );
        return state;
      }

      const newElements = new Map(targetModalLayer.elements);
      newElements.set(
        action.modalLayerElement.elementId,
        action.modalLayerElement,
      );

      const newAllModalLayers = [...state.allModalLayers];
      newAllModalLayers[targetModalLayerIndex] = {
        ...targetModalLayer,
        elements: newElements,
      };

      return {
        ...state,
        allModalLayers: newAllModalLayers,
      };
    }

    case "closeModalLayer": {
      const targetModalLayerIndex = state.allModalLayers.findIndex(
        (each) => each.layerId === action.targetModalLayerId,
      );
      // Mirror of the closeLayer race: a second close before the modal
      // layer's binding cleanup ran is a no-op, not an error.
      if (targetModalLayerIndex === -1) {
        warnInDev(
          `[ink-cartridge] closeModalLayer("${action.targetModalLayerId}") ignored: no modal layer with this ID is registered. Duplicate closes are no-ops.`,
        );
        return state;
      }

      const remainingModalLayers = state.allModalLayers.filter(
        (_, idx) => idx !== targetModalLayerIndex,
      );
      const newModalLayers = sortLayers(remainingModalLayers);

      return {
        ...state,
        allModalLayers: newModalLayers,
      };
    }

    case "eraseElementInModalLayer": {
      const targetModalLayerIndex = state.allModalLayers.findIndex(
        (each) => each.layerId === action.targetModalLayerId,
      );

      if (targetModalLayerIndex === -1) {
        throw new Error(
          `
          [ink-cartridge] The modal layer ${action.targetModalLayerId} you want to delete elements from is not registered; you might have made a typo, or it was never registered at all.
          `,
        );
      }

      const targetModalLayer = state.allModalLayers[targetModalLayerIndex];

      // Mirror of the eraseElement no-op for the same key-mash race.
      if (!targetModalLayer.elements.has(action.targetElementId)) {
        warnInDev(
          `[ink-cartridge] eraseElementInModalLayer("${action.targetElementId}" from "${action.targetModalLayerId}") ignored: no element with this ID is applied. Duplicate erases are no-ops.`,
        );
        return state;
      }

      const newElements = new Map(targetModalLayer.elements);
      newElements.delete(action.targetElementId);

      const newAllModalLayers = [...state.allModalLayers];
      newAllModalLayers[targetModalLayerIndex] = {
        ...targetModalLayer,
        elements: newElements,
      };

      return {
        ...state,
        allModalLayers: newAllModalLayers,
      };
    }

    case "closeAllModalLayer": {
      return {
        ...state,
        allModalLayers: [],
      };
    }

    case "activateElementInModalLayer": {
      const targetModalLayerIndex = state.allModalLayers.findIndex(
        (each) => each.layerId === action.targetModalLayerId,
      );
      if (targetModalLayerIndex === -1) {
        throw new Error(
          `[ink-cartridge] activateElementInModalLayer: modal layer "${action.targetModalLayerId}" is not registered.`,
        );
      }
      const targetModalLayer = state.allModalLayers[targetModalLayerIndex];
      const targetElement = targetModalLayer.elements.get(
        action.targetElementId,
      );
      if (!targetElement) {
        throw new Error(
          `[ink-cartridge] activateElementInModalLayer: element "${action.targetElementId}" does not exist on modal layer "${action.targetModalLayerId}".`,
        );
      }
      if (targetElement.active !== false) return state;

      const newElements = new Map(targetModalLayer.elements);
      newElements.set(action.targetElementId, {
        ...targetElement,
        active: true,
      });
      const newAllModalLayers = [...state.allModalLayers];
      newAllModalLayers[targetModalLayerIndex] = {
        ...targetModalLayer,
        elements: newElements,
      };
      return { ...state, allModalLayers: newAllModalLayers };
    }

    case "deactivateElementInModalLayer": {
      const targetModalLayerIndex = state.allModalLayers.findIndex(
        (each) => each.layerId === action.targetModalLayerId,
      );
      if (targetModalLayerIndex === -1) {
        throw new Error(
          `[ink-cartridge] deactivateElementInModalLayer: modal layer "${action.targetModalLayerId}" is not registered.`,
        );
      }
      const targetModalLayer = state.allModalLayers[targetModalLayerIndex];
      const targetElement = targetModalLayer.elements.get(
        action.targetElementId,
      );
      if (!targetElement) {
        throw new Error(
          `[ink-cartridge] deactivateElementInModalLayer: element "${action.targetElementId}" does not exist on modal layer "${action.targetModalLayerId}".`,
        );
      }
      if (targetElement.active === false) return state;

      const newElements = new Map(targetModalLayer.elements);
      newElements.set(action.targetElementId, {
        ...targetElement,
        active: false,
      });
      const newAllModalLayers = [...state.allModalLayers];
      newAllModalLayers[targetModalLayerIndex] = {
        ...targetModalLayer,
        elements: newElements,
      };
      return { ...state, allModalLayers: newAllModalLayers };
    }

    default:
      return state;
  }
}

export interface ScenarioManagementProviderProps {
  children: ReactNode;
  /** 默认屏幕组件（必填，需先 registerComponent） */
  defaultScreen: React.ComponentType<any>;
  /** 默认参数（可选，未传则使用注册时的模板参数） */
  defaultParams?: Record<string, unknown>;

  fullScreen?: boolean;
}

/**
 * Screen-management context provider.
 *
 * Wraps the application and enables tree-based screen navigation, overlays,
 * and module-level navigation functions.
 */
export function ScenarioManagementProvider({
  children,
  defaultScreen,
  defaultParams,
  fullScreen,
}: ScenarioManagementProviderProps) {
  if (!hasComponent(defaultScreen)) {
    throw new Error(
      `[Ink-Cartridge] defaultScreen "${
        defaultScreen.displayName || defaultScreen.name || "anonymous"
      }" is not registered. Please call registerComponent() first.`,
    );
  }

  const initialParams = defaultParams ?? getTemplate(defaultScreen) ?? {};

  const [state, dispatch] = useReducer(screenReducer, {
    path: [defaultScreen],
    pathParams: [initialParams],
    counter: 0,
    allLayers: [],
    allModalLayers: [],
  });

  useEffect(() => {
    _dispatchers.add(dispatch);
    return () => {
      _dispatchers.delete(dispatch);
    };
  }, []);

  const topComponent = state.path[state.path.length - 1];
  const topParams = state.pathParams[state.pathParams.length - 1];

  const pageLayer = useMemo(
    () =>
      React.createElement(topComponent, {
        ...topParams,
        key: state.counter,
      }),
    [topComponent, topParams, state.counter],
  );

  // Context 内的导航方法
  const skipInContext: SkipFn = useMemo(
    () => (component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${
            component.displayName || component.name || "anonymous"
          }" is not registered.`,
        );
      }
      dispatch({
        type: "skip",
        component,
        params: params as Record<string, unknown>,
        onlyAttribute: options?.onlyAttribute ?? false,
      });
    },
    [],
  );

  const backInContext: BackFn = useMemo(
    () =>
      (levels: number = 1) => {
        if (levels < 1) {
          throw new Error("[Ink-Cartridge] back() levels must be >= 1.");
        }
        dispatch({ type: "back", levels });
      },
    [],
  );

  const gotoScreenInContext: GotoScreenFn = useMemo(
    () => (component, params) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${
            component.displayName || component.name || "anonymous"
          }" is not registered.`,
        );
      }
      dispatch({
        type: "gotoScreen",
        component,
        params: params as Record<string, unknown>,
      });
    },
    [],
  );

  const openLayerInContext: OpenLayerFn = useMemo(
    () => (layerId: string, zIndex: number, options?: LayerOptions) => {
      dispatch({
        type: "openLayer",
        layerId,
        zIndex,
        options: options,
      });
    },
    [],
  );

  const applyElementInContext: ApplyElementFn = useMemo(
    () => (targetLayerId: string, layerElement: LayerElementInput<any>) => {
      dispatch({
        type: "applyElement",
        targetLayerId,
        layerElement: toStoredLayerElement(layerElement),
      });
    },
    [],
  );

  const closeLayerInContext: CloseLayerFn = useMemo(
    () => (targetLayerId: string) => {
      dispatch({ type: "closeLayer", targetLayerId });
    },
    [],
  );

  const eraseElementInContext: EraseElementFn = useMemo(
    () => (targetLayerId: string, targetElementId: string) => {
      dispatch({ type: "eraseElement", targetLayerId, targetElementId });
    },
    [],
  );

  const closeAllLayerInContext: CloseAllLayerFn = useMemo(
    () => () => {
      dispatch({ type: "closeAllLayer" });
    },
    [],
  );

  const activateElementInContext: ActivateElementFn = useMemo(
    () => (targetLayerId: string, targetElementId: string) => {
      dispatch({ type: "activateElement", targetLayerId, targetElementId });
    },
    [],
  );

  const deactivateElementInContext: DeactivateElementFn = useMemo(
    () => (targetLayerId: string, targetElementId: string) => {
      dispatch({ type: "deactivateElement", targetLayerId, targetElementId });
    },
    [],
  );

  const openModalLayerInContext: OpenModalLayerFn = useMemo(
    () => (layerId: string, zIndex: number, options?: ModalLayerOptions) => {
      dispatch({
        type: "openModalLayer",
        layerId,
        zIndex,
        options: options,
      });
    },
    [],
  );

  const applyElementToModalLayerInContext: ApplyElementToModalLayerFn = useMemo(
    () => (targetModalLayerId: string, modalLayerElement: LayerElementInput<any>) => {
      dispatch({
        type: "applyElementToModalLayer",
        targetModalLayerId,
        modalLayerElement: toStoredLayerElement(modalLayerElement),
      });
    },
    [],
  );

  const closeModalLayerInContext: CloseModalLayerFn = useMemo(
    () => (targetModalLayerId: string) => {
      dispatch({ type: "closeModalLayer", targetModalLayerId });
    },
    [],
  );

  const eraseElementInModalLayerInContext: EraseElementInModalLayerFn = useMemo(
    () => (targetModalLayerId: string, targetElementId: string) => {
      dispatch({
        type: "eraseElementInModalLayer",
        targetModalLayerId,
        targetElementId,
      });
    },
    [],
  );

  const closeAllModalLayerInContext: CloseAllModalLayerFn = useMemo(
    () => () => {
      dispatch({ type: "closeAllModalLayer" });
    },
    [],
  );

  const activateElementInModalLayerInContext: ActivateElementInModalLayerFn =
    useMemo(
      () => (targetModalLayerId: string, targetElementId: string) => {
        dispatch({
          type: "activateElementInModalLayer",
          targetModalLayerId,
          targetElementId,
        });
      },
      [],
    );

  const deactivateElementInModalLayerInContext: DeactivateElementInModalLayerFn =
    useMemo(
      () => (targetModalLayerId: string, targetElementId: string) => {
        dispatch({
          type: "deactivateElementInModalLayer",
          targetModalLayerId,
          targetElementId,
        });
      },
      [],
    );

  const value: ScreenSystemContextValue = useMemo(
    () => ({
      pageLayer,
      allLayers: state.allLayers,
      allModalLayers: state.allModalLayers,
      currentPath: state.path,
      skip: skipInContext,
      back: backInContext,
      gotoScreen: gotoScreenInContext,
      openLayer: openLayerInContext,
      applyElement: applyElementInContext,
      closeLayer: closeLayerInContext,
      eraseElement: eraseElementInContext,
      closeAllLayer: closeAllLayerInContext,
      activateElement: activateElementInContext,
      deactivateElement: deactivateElementInContext,
      openModalLayer: openModalLayerInContext,
      applyElementToModalLayer: applyElementToModalLayerInContext,
      closeModalLayer: closeModalLayerInContext,
      eraseElementInModalLayer: eraseElementInModalLayerInContext,
      closeAllModalLayer: closeAllModalLayerInContext,
      activateElementInModalLayer: activateElementInModalLayerInContext,
      deactivateElementInModalLayer: deactivateElementInModalLayerInContext,
      fullScreen,
    }),
    [
      pageLayer,
      state.path,
      state.allLayers,
      state.allModalLayers,
      skipInContext,
      backInContext,
      gotoScreenInContext,
      openLayerInContext,
      applyElementInContext,
      closeLayerInContext,
      eraseElementInContext,
      closeAllLayerInContext,
      activateElementInContext,
      deactivateElementInContext,
      openModalLayerInContext,
      applyElementToModalLayerInContext,
      closeModalLayerInContext,
      eraseElementInModalLayerInContext,
      closeAllModalLayerInContext,
      activateElementInModalLayerInContext,
      deactivateElementInModalLayerInContext,
      fullScreen,
    ],
  );

  return (
    <ScreenSystemContext.Provider value={value}>
      {children}
    </ScreenSystemContext.Provider>
  );
}
