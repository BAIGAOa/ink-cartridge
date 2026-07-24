import React, {
  useReducer,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { ScreenSystemContext, ScreenSystemContextValue } from "./context.js";
import { getTemplate, hasComponent, isChildOf, getParent } from "./registry.js";
import { ScreenAction } from "./types/actions.js";
import {  BackFn, CloseAllModalsFn, CloseModalFn, GotoScreenFn, ModalEntry, OpenModalFn, OpenModalOptions, ScreenState, SkipFn, SkipOptions } from "./types.js";
import { ApplyElementFn, CloseAllLayerFn, CloseLayerFn, EraseElementFn, Layer, LayerOptions, OpenLayerFn } from "./types/layer.js";
import { LayerElement } from "./types/element.js";

const _dispatchers = new Set<React.Dispatch<ScreenAction>>();

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



function sortLayers(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => {
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Sort modals by zIndex ascending, then by createdAt for tie-breaking.
 *
 * The modal with the highest zIndex becomes the active modal.
 * Architecturally symmetric to {@link sortOverlays}.
 */
function sortModals(modals: ModalEntry[]): ModalEntry[] {
  return [...modals].sort((a, b) => {
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
      `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered. Please call registerComponent() first.`,
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
      `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: "gotoScreen",
    component,
    params: params as Record<string, unknown>,
  });
}



/**
 * Open a modal on top of all overlays.
 *
 * Only one modal is active at a time (the one with the highest zIndex).
 * The active modal receives absolute keyboard priority, consuming all
 * keyboard events before they reach overlays or screens.
 *
 * Calling with an ID that already exists is a no-op — the existing modal
 * is left unchanged. This supports simple toggle bindings without guard refs.
 *
 * @param id         Unique identifier for this modal.
 * @param component  The modal component (must be registered).
 * @param params     Props to pass to the modal component.
 * @param options    Optional zIndex and renderNow settings.
 *
 * @throws If the provider is not mounted or the component is not registered.
 */
export function openModal<C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenModalOptions,
): void {
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: "openModal",
    id,
    component,
    params: params as Record<string, unknown>,
    zIndex: options?.zIndex,
    renderNow: options?.renderNow ?? false,
    persistent: options?.persistent,
  });
}

/**
 * Close a specific modal by its ID.
 *
 * When the active modal is closed, the modal with the next highest zIndex
 * automatically becomes active.
 *
 * If no modal with the given ID exists, this is a no-op — safe to call
 * even when the modal may have already been closed.
 *
 * @param id  The ID of the modal to close.
 *
 * @throws If the provider is not mounted.
 */
export function closeModal(id: string): void {
  getDispatch()({ type: "closeModal", id });
}

/**
 * Close all open modals.
 *
 * @throws If the provider is not mounted.
 */
export function closeAllModals(): void {
  getDispatch()({ type: "closeAllModals" });
}

/**
 * Open a new layer with a unique ID and z-index.
 */
export function openLayer(layerId: string, zIndex: number, options?: LayerOptions): void {
  getDispatch()({ type: "openLayer", layerId, zIndex, options });
}

/**
 * Apply an element to a registered layer.
 */
export function applyElement(targetLayerId: string, layerElement: LayerElement): void {
  getDispatch()({ type: "applyElement", targetLayerId, layerElement });
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
export function eraseElement(targetLayerId: string, targetElementId: string): void {
  getDispatch()({ type: "eraseElement", targetLayerId, targetElementId });
}

/**
 * Close all layers at once.
 */
export function closeAllLayer(): void {
  getDispatch()({ type: "closeAllLayer" });
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
 * (cross-branch), openOverlay, closeOverlay, closeAllOverlays,
 * activateOverlay, and deactivateOverlay.
 *
 * Navigation actions filter out non-persistent overlays/modals and
 * recalculate active IDs based on whether the origin screen of each
 * persistent entry is at the top of the new path.
 */
function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {
    case "skip": {
      const current = state.path[state.path.length - 1];

      if (!isChildOf(action.component, current)) {
        throw new Error(
          `[Ink-Cartridge] "${action.component.displayName || action.component.name || "anonymous"}" is not a child of "${current.displayName || current.name || "anonymous"}". Use skip to navigate down the tree, or gotoScreen to jump across branches.`,
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

     
      const persistentModals = state.modals.filter((m) => m.persistent);

      const crossPageLayers = state.allLayers.filter(each => each.crossPage === true)

      return {
        path: newPath,
        pathParams: [...state.pathParams, mergedParams],
        modals: persistentModals,
        counter,
        allLayers: crossPageLayers
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
      
      const persistentModals = state.modals.filter((m) => m.persistent);

      const crossPageLayers = state.allLayers.filter(each => each.crossPage === true)

      return {
        path: newPath,
        pathParams: state.pathParams.slice(0, -levels),
        modals: persistentModals,
        counter: state.counter + 1,
        allLayers: crossPageLayers
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

      const persistentModals = state.modals.filter((m) => m.persistent);

      const crossPageLayers = state.allLayers.filter(each => each.crossPage === true)
      return {
        path: newPath,
        pathParams: newPathParams,
        modals: persistentModals,
        activeModalId,
        counter: state.counter + 1,
        allLayers: crossPageLayers
      };
    }

    case "openLayer": {
      if (state.allLayers.some(each => each.layerId === action.layerId)) {
        return state
      }

      const newLayer: Layer = {
        layerId: action.layerId,
        zIndex: action.zIndex,
        elements: new Map(),
        crossPage: action.options?.crossPage ?? false,
        // Use the current timestamp as the creation time to ensure no errors occur, 
        // even if the z-index values ​​are identical.
        createdAt: Date.now()
      }

      const newLayers = sortLayers([...state.allLayers, newLayer])

      return {
        ...state,
        allLayers: newLayers
      }
    }

    case "applyElement": {
      const targetLayer = state.allLayers.find(each => each.layerId === action.targetLayerId)

      if (!targetLayer) {
        throw new Error(
          `
          [ink-cartridge] The target ${action.targetLayerId} you entered has not been registered.

          Try calling the openLayer method.
          For example:
          const { openLayer } = useScreenSystem()

          openLayer(${action.targetLayerId}, 1)
          `
        )
      }

      if (targetLayer.elements.has(action.layerElement.elementId)) {
        throw new Error(
          `
          [in-cartridge] The element ID ${action.layerElement.elementId} you are applying has already been used on target layer ${targetLayer.layerId}; 
          try using a new one or deleting the old one.
          `
        )
      }

      targetLayer.elements.set(action.layerElement.elementId, action.layerElement)

      return state
    }

    case "closeLayer": {
      const targetLayer = state.allLayers.findIndex(each => each.layerId === action.targetLayerId)
      if (targetLayer === -1) {
        throw new Error(
          `
          [ink-cartridge] The layer ${action.targetLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `
        )
      }

      state.allLayers.splice(targetLayer, 1)

      const newLayers = sortLayers(state.allLayers)

      return {
        ...state,
        allLayers: newLayers
      }
    }

    case "eraseElement": {
      const targetLayer = state.allLayers.find(each => each.layerId === action.targetLayerId)

      if (!targetLayer) {
        throw new Error(
          `
          [ink-cartridge] The layer ${action.targetLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `
        )
      }

      if (!targetLayer.elements.has(action.targetElementId)) {
        throw new Error(
          `[ink-cartridge] The target element ${action.targetElementId} does not exist in layer ${action.targetLayerId}; you may have mistyped the string, or the corresponding element was never registered.`
        )
      }

      targetLayer.elements.delete(action.targetElementId)

      return state
    }

    case "closeAllLayer": {
      return {
        ...state,
        allLayers: []
      }
    }

    case "openModal": {
      if (state.modals.some((m) => m.id === action.id)) {
        return state;
      }

      const newEntry: ModalEntry = {
        id: action.id,
        component: action.component,
        props: action.params,
        zIndex: action.zIndex ?? state.modals.length,
        createdAt: Date.now(),
        renderNow: action.renderNow ?? false,
        persistent: action.persistent,
        originComponent: action.persistent
          ? state.path[state.path.length - 1]
          : undefined,
      };

      const newModals = sortModals([...state.modals, newEntry]);
      // The last element (highest zIndex) is the active modal
      const activeId =
        newModals.length > 0 ? newModals[newModals.length - 1].id : null;

      return {
        ...state,
        modals: newModals,
        activeModalId: activeId,
      };
    }

    case "closeModal": {
      if (!state.modals.some((m) => m.id === action.id)) {
        return state;
      }

      const newModals = state.modals.filter((m) => m.id !== action.id);
      const activeId =
        newModals.length > 0 ? newModals[newModals.length - 1].id : null;

      return {
        ...state,
        modals: newModals,
        activeModalId: activeId,
      };
    }

    case "closeAllModals": {
      return {
        ...state,
        modals: [],
        activeModalId: null,
      };
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
      `[Ink-Cartridge] defaultScreen "${defaultScreen.displayName || defaultScreen.name || "anonymous"}" is not registered. Please call registerComponent() first.`,
    );
  }

  const initialParams = defaultParams ?? getTemplate(defaultScreen) ?? {};

  const [state, dispatch] = useReducer(screenReducer, {
    path: [defaultScreen],
    pathParams: [initialParams],
    modals: [],
    activeModalId: null,
    counter: 0,
    allLayers: []
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

  // Determine which modals should be rendered: active modal
  // (highest zIndex) plus any modals with renderNow: true.
  const renderedModalEntries = useMemo(
    () =>
      state.modals.filter(
        (entry) => entry.id === state.activeModalId || entry.renderNow,
      ),
    [state.modals, state.activeModalId],
  );

  // Render modal elements for the modals that should be displayed.
  // Sorted by zIndex ascending so the last element (highest zIndex)
  // renders on top.
  const currentModals = useMemo(
    () =>
      renderedModalEntries.map((entry) =>
        React.createElement(entry.component, {
          ...entry.props,
          key: entry.id,
        }),
      ),
    [renderedModalEntries],
  );

  // Context 内的导航方法
  const skipInContext: SkipFn = useMemo(
    () => (component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered.`,
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
          `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered.`,
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
        options: options
      })
    },
    []
  )

  const applyElementInContext: ApplyElementFn = useMemo(
    () => (targetLayerId: string, layerElement: LayerElement) => {
      dispatch({ type: "applyElement", targetLayerId, layerElement });
    },
    []
  );

  const closeLayerInContext: CloseLayerFn = useMemo(
    () => (targetLayerId: string) => {
      dispatch({ type: "closeLayer", targetLayerId });
    },
    []
  );

  const eraseElementInContext: EraseElementFn = useMemo(
    () => (targetLayerId: string, targetElementId: string) => {
      dispatch({ type: "eraseElement", targetLayerId, targetElementId });
    },
    []
  );

  const closeAllLayerInContext: CloseAllLayerFn = useMemo(
    () => () => {
      dispatch({ type: "closeAllLayer" });
    },
    []
  );

  const openModalInContext: OpenModalFn = useMemo(
    () => (id, component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${component.displayName || component.name || "anonymous"}" is not registered.`,
        );
      }
      dispatch({
        type: "openModal",
        id,
        component,
        params: params as Record<string, unknown>,
        zIndex: options?.zIndex,
        renderNow: options?.renderNow,
        persistent: options?.persistent,
      });
    },
    [],
  );

  const closeModalInContext: CloseModalFn = useMemo(
    () => (id: string) => dispatch({ type: "closeModal", id }),
    [],
  );

  const closeAllModalsInContext: CloseAllModalsFn = useMemo(
    () => () => dispatch({ type: "closeAllModals" }),
    [],
  );

  // Compute activeModal from state
  const activeModal = state.activeModalId
    ? (state.modals.find((m) => m.id === state.activeModalId) ?? null)
    : null;

  const value: ScreenSystemContextValue = useMemo(
    () => ({
      pageLayer,
      currentModals,
      allLayers: state.allLayers,
      currentPath: state.path,
      skip: skipInContext,
      back: backInContext,
      gotoScreen: gotoScreenInContext,
      displayedModals: state.modals,
      renderedModalEntries,
      activeModalId: state.activeModalId,
      activeModal,
      modalQueue: state.modals,
      openModal: openModalInContext,
      closeModal: closeModalInContext,
      closeAllModals: closeAllModalsInContext,
      openLayer: openLayerInContext,
      applyElement: applyElementInContext,
      closeLayer: closeLayerInContext,
      eraseElement: eraseElementInContext,
      closeAllLayer: closeAllLayerInContext,
      fullScreen,
    }),
    [
      pageLayer,
      currentModals,
      state.path,
      state.modals,
      state.allLayers,
      renderedModalEntries,
      activeModal,
      skipInContext,
      backInContext,
      gotoScreenInContext,
      openModalInContext,
      closeModalInContext,
      closeAllModalsInContext,
      openLayerInContext,
      applyElementInContext,
      closeLayerInContext,
      eraseElementInContext,
      closeAllLayerInContext,
      state.activeModalId,
      fullScreen,
    ],
  );

  return (
    <ScreenSystemContext.Provider value={value}>
      {children}
    </ScreenSystemContext.Provider>
  );
}
