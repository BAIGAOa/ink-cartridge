import React, { useReducer, useMemo, useEffect, ReactNode } from 'react';
import { ScreenSystemContext } from './context.js';
import {
  ScreenState,
  ScreenAction,
  SkipOptions,
  SkipFn,
  BackFn,
  GotoScreenFn,
  OpenOverlayFn,
  CloseOverlayFn,
  CloseAllOverlaysFn,
  ActivateOverlayFn,
  DeactivateOverlayFn,
  OpenModalFn,
  CloseModalFn,
  CloseAllModalsFn,
  OverlayEntry,
  ModalEntry,
  OpenOverlayOptions,
  OpenModalOptions,
} from './types.js';
import {
  getTemplate,
  hasComponent,
  isChildOf,
  getParent,
} from './registry.js';



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
      '[Ink-Cartridge] Navigation function called before Provider is mounted. Please ensure <ScenarioManagementProvider> is mounted in the component tree.',
    );
  }
  return [..._dispatchers][_dispatchers.size - 1];
}

/**
 * Sort overlays by zIndex ascending, then by createdAt for tie-breaking.
 */
function sortOverlays(overlays: OverlayEntry[]): OverlayEntry[] {
  return [...overlays].sort((a, b) => {
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
      `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: 'skip',
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
    throw new Error(
      '[Ink-Cartridge] back() levels must be >= 1.',
    );
  }
  getDispatch()({ type: 'back', levels });
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
      `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: 'gotoScreen',
    component,
    params: params as Record<string, unknown>,
  });
}

/**
 * Open a floating overlay on top of the current screen stack.
 *
 * Multiple overlays can be open simultaneously, distinguished by unique IDs.
 *
 * @param id         Unique identifier for this overlay.
 * @param component  The overlay component (must be registered).
 * @param params     Props to pass to the overlay component.
 * @param options    Optional activation and zIndex settings.
 *
 * @throws If the provider is not mounted, the component is not registered,
 *         or the ID is already in use.
 */
export function openOverlay<C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenOverlayOptions,
): void {
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: 'openOverlay',
    id,
    component,
    params: params as Record<string, unknown>,
    activate: options?.activate ?? true,
    zIndex: options?.zIndex,
  });
}

/**
 * Close a specific overlay by its ID.
 *
 * @param id  The ID of the overlay to close.
 *
 * @throws If the provider is not mounted.
 */
export function closeOverlay(id: string): void {
  getDispatch()({ type: 'closeOverlay', id });
}

/**
 * Close all open overlays.
 *
 * @throws If the provider is not mounted.
 */
export function closeAllOverlays(): void {
  getDispatch()({ type: 'closeAllOverlays' });
}

/**
 * Activate an overlay by its ID (so it receives keyboard events).
 *
 * @param id  The ID of the overlay to activate.
 *
 * @throws If the provider is not mounted or the overlay ID does not exist.
 */
export function activateOverlay(id: string): void {
  getDispatch()({ type: 'activateOverlay', id });
}

/**
 * Deactivate an overlay by its ID (so it no longer receives keyboard events).
 *
 * @param id  The ID of the overlay to deactivate.
 *
 * @throws If the provider is not mounted.
 */
export function deactivateOverlay(id: string): void {
  getDispatch()({ type: 'deactivateOverlay', id });
}

/**
 * Open a modal on top of all overlays.
 *
 * Only one modal is active at a time (the one with the highest zIndex).
 * The active modal receives absolute keyboard priority, consuming all
 * keyboard events before they reach overlays or screens.
 *
 * @param id         Unique identifier for this modal.
 * @param component  The modal component (must be registered).
 * @param params     Props to pass to the modal component.
 * @param options    Optional zIndex and renderNow settings.
 *
 * @throws If the provider is not mounted, the component is not registered,
 *         or the ID is already in use.
 */
export function openModal<C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenModalOptions,
): void {
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered. Please call registerComponent() first.`,
    );
  }
  getDispatch()({
    type: 'openModal',
    id,
    component,
    params: params as Record<string, unknown>,
    zIndex: options?.zIndex,
    renderNow: options?.renderNow,
  });
}

/**
 * Close a specific modal by its ID.
 *
 * When the active modal is closed, the modal with the next highest zIndex
 * automatically becomes active.
 *
 * @param id  The ID of the modal to close.
 *
 * @throws If the provider is not mounted.
 */
export function closeModal(id: string): void {
  getDispatch()({ type: 'closeModal', id });
}

/**
 * Close all open modals.
 *
 * @throws If the provider is not mounted.
 */
export function closeAllModals(): void {
  getDispatch()({ type: 'closeAllModals' });
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
 * Navigation actions (skip / back / gotoScreen) clear all open overlays.
 */
function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {

    case 'skip': {
      const current = state.path[state.path.length - 1];

      if (!isChildOf(action.component, current)) {
        throw new Error(
          `[Ink-Cartridge] "${action.component.displayName || action.component.name || 'anonymous'}" is not a child of "${current.displayName || current.name || 'anonymous'}". Use skip to navigate down the tree, or gotoScreen to jump across branches.`,
        );
      }

      const sameComponent = action.component === current;
      const counter = sameComponent && action.onlyAttribute
        ? state.counter
        : state.counter + 1;

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      return {
        path: [...state.path, action.component],
        pathParams: [...state.pathParams, mergedParams],
        overlays: [],
        activeOverlayIds: new Set<string>(),
        modals: [],
        activeModalId: null,
        counter,
      };
    }

    case 'back': {
      const levels = action.levels ?? 1;

      if (state.path.length <= levels) {
        throw new Error(
          levels === 1
            ? '[Ink-Cartridge] back() failed: already at the root node, cannot go back.'
            : `[Ink-Cartridge] back(${levels}) failed: current depth is ${state.path.length}, cannot go back ${levels} levels.`,
        );
      }

      return {
        path: state.path.slice(0, -levels),
        pathParams: state.pathParams.slice(0, -levels),
        overlays: [],
        activeOverlayIds: new Set<string>(),
        modals: [],
        activeModalId: null,
        counter: state.counter + 1,
      };
    }

    case 'gotoScreen': {
      const commonAncestor = findCommonAncestor(state.path, action.component);
      const ancestorIndex = state.path.indexOf(commonAncestor);

      if (ancestorIndex === -1) {
        throw new Error(
          `[Ink-Cartridge] gotoScreen failed: cannot locate common ancestor.`,
        );
      }

      const suffix = buildPathFrom(commonAncestor, action.component);
      const newPath = [
        ...state.path.slice(0, ancestorIndex + 1),
        ...suffix,
      ];

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      const newPathParams = [
        ...state.pathParams.slice(0, ancestorIndex + 1),
        ...suffix.map((comp) => {
          const tpl = getTemplate(comp) ?? {};
          return comp === action.component ? mergedParams : tpl;
        }),
      ];

      return {
        path: newPath,
        pathParams: newPathParams,
        overlays: [],
        activeOverlayIds: new Set<string>(),
        modals: [],
        activeModalId: null,
        counter: state.counter + 1,
      };
    }

    case 'openOverlay': {
      if (state.overlays.some(o => o.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Overlay with id "${action.id}" already exists. Use a unique id for each overlay.`,
        );
      }

      if (state.modals.some(m => m.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot open overlay "${action.id}": this ID is already in use by a modal. Use a unique id.`,
        );
      }

      const newEntry: OverlayEntry = {
        id: action.id,
        component: action.component,
        props: action.params,
        zIndex: action.zIndex ?? state.overlays.length,
        createdAt: Date.now(),
      };

      const newOverlays = sortOverlays([...state.overlays, newEntry]);
      const newActiveIds = new Set(state.activeOverlayIds);

      if (action.activate) {
        newActiveIds.add(action.id);
      }

      return {
        ...state,
        overlays: newOverlays,
        activeOverlayIds: newActiveIds,
      };
    }

    case 'closeOverlay': {
      if (!state.overlays.some(o => o.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot close overlay "${action.id}": no overlay with that ID exists.`,
        );
      }

      const newOverlays = state.overlays.filter(o => o.id !== action.id);
      const newActiveIds = new Set(state.activeOverlayIds);
      newActiveIds.delete(action.id);

      return {
        ...state,
        overlays: newOverlays,
        activeOverlayIds: newActiveIds,
      };
    }

    case 'closeAllOverlays': {
      return {
        ...state,
        overlays: [],
        activeOverlayIds: new Set<string>(),
      };
    }

    case 'activateOverlay': {
      if (!state.overlays.some(o => o.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot activate overlay "${action.id}": no overlay with that ID exists.`,
        );
      }

      const newActiveIds = new Set(state.activeOverlayIds);
      newActiveIds.add(action.id);

      return {
        ...state,
        activeOverlayIds: newActiveIds,
      };
    }

    case 'deactivateOverlay': {
      if (!state.overlays.some(o => o.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot deactivate overlay "${action.id}": no overlay with that ID exists.`,
        );
      }

      const newActiveIds = new Set(state.activeOverlayIds);
      newActiveIds.delete(action.id);

      return {
        ...state,
        activeOverlayIds: newActiveIds,
      };
    }

    case 'openModal': {
      if (state.modals.some(m => m.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Modal with id "${action.id}" already exists. Use a unique id for each modal.`,
        );
      }

      if (state.overlays.some(o => o.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot open modal "${action.id}": this ID is already in use by an overlay. Use a unique id.`,
        );
      }

      const newEntry: ModalEntry = {
        id: action.id,
        component: action.component,
        props: action.params,
        zIndex: action.zIndex ?? state.modals.length,
        createdAt: Date.now(),
        renderNow: action.renderNow ?? false,
      };

      const newModals = sortModals([...state.modals, newEntry]);
      // The last element (highest zIndex) is the active modal
      const activeId = newModals.length > 0 ? newModals[newModals.length - 1].id : null;

      return {
        ...state,
        modals: newModals,
        activeModalId: activeId,
      };
    }

    case 'closeModal': {
      if (!state.modals.some(m => m.id === action.id)) {
        throw new Error(
          `[Ink-Cartridge] Cannot close modal "${action.id}": no modal with that ID exists.`,
        );
      }

      const newModals = state.modals.filter(m => m.id !== action.id);
      const activeId = newModals.length > 0 ? newModals[newModals.length - 1].id : null;

      return {
        ...state,
        modals: newModals,
        activeModalId: activeId,
      };
    }

    case 'closeAllModals': {
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
}: ScenarioManagementProviderProps) {
  if (!hasComponent(defaultScreen)) {
    throw new Error(
      `[Ink-Cartridge] defaultScreen "${defaultScreen.displayName || defaultScreen.name || 'anonymous'}" is not registered. Please call registerComponent() first.`,
    );
  }

  const initialParams =
    defaultParams ?? getTemplate(defaultScreen) ?? {};

  const [state, dispatch] = useReducer(screenReducer, {
    path: [defaultScreen],
    pathParams: [initialParams],
    overlays: [],
    activeOverlayIds: new Set<string>(),
    modals: [],
    activeModalId: null,
    counter: 0,
  });

  useEffect(() => {
    _dispatchers.add(dispatch);
    return () => {
      _dispatchers.delete(dispatch);
    };
  }, []);

  const topComponent = state.path[state.path.length - 1];
  const topParams = state.pathParams[state.pathParams.length - 1];

  const currentScreen = useMemo(
    () =>
      React.createElement(topComponent, {
        ...topParams,
        key: state.counter,
      }),
    [topComponent, topParams, state.counter],
  );

  // Render all overlay elements (sorted by zIndex)
  const currentOverlays = useMemo(
    () =>
      state.overlays.map((entry) =>
        React.createElement(entry.component, {
          ...entry.props,
          key: entry.id,
        }),
      ),
    [state.overlays],
  );

  // Determine which modals should be rendered: active modal
  // (highest zIndex) plus any modals with renderNow: true.
  const renderedModalEntries = useMemo(
    () => state.modals.filter(
      entry => entry.id === state.activeModalId || entry.renderNow,
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
          `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered.`,
        );
      }
      dispatch({
        type: 'skip',
        component,
        params: params as Record<string, unknown>,
        onlyAttribute: options?.onlyAttribute ?? false,
      });
    },
    [],
  );

  const backInContext: BackFn = useMemo(
    () => (levels: number = 1) => {
      if (levels < 1) {
        throw new Error(
          '[Ink-Cartridge] back() levels must be >= 1.',
        );
      }
      dispatch({ type: 'back', levels });
    },
    [],
  );

  const gotoScreenInContext: GotoScreenFn = useMemo(
    () => (component, params) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered.`,
        );
      }
      dispatch({
        type: 'gotoScreen',
        component,
        params: params as Record<string, unknown>,
      });
    },
    [],
  );

  const openOverlayInContext: OpenOverlayFn = useMemo(
    () => (id, component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered.`,
        );
      }
      dispatch({
        type: 'openOverlay',
        id,
        component,
        params: params as Record<string, unknown>,
        activate: options?.activate ?? true,
        zIndex: options?.zIndex,
      });
    },
    [],
  );

  const closeOverlayInContext: CloseOverlayFn = useMemo(
    () => (id: string) => dispatch({ type: 'closeOverlay', id }),
    [],
  );

  const closeAllOverlaysInContext: CloseAllOverlaysFn = useMemo(
    () => () => dispatch({ type: 'closeAllOverlays' }),
    [],
  );

  const activateOverlayInContext: ActivateOverlayFn = useMemo(
    () => (id: string) => dispatch({ type: 'activateOverlay', id }),
    [],
  );

  const deactivateOverlayInContext: DeactivateOverlayFn = useMemo(
    () => (id: string) => dispatch({ type: 'deactivateOverlay', id }),
    [],
  );

  const openModalInContext: OpenModalFn = useMemo(
    () => (id, component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Cartridge] Component "${component.displayName || component.name || 'anonymous'}" is not registered.`,
        );
      }
      dispatch({
        type: 'openModal',
        id,
        component,
        params: params as Record<string, unknown>,
        zIndex: options?.zIndex,
        renderNow: options?.renderNow,
      });
    },
    [],
  );

  const closeModalInContext: CloseModalFn = useMemo(
    () => (id: string) => dispatch({ type: 'closeModal', id }),
    [],
  );

  const closeAllModalsInContext: CloseAllModalsFn = useMemo(
    () => () => dispatch({ type: 'closeAllModals' }),
    [],
  );

  const activeOverlayIdsArray = useMemo(
    () => [...state.activeOverlayIds],
    [state.activeOverlayIds],
  );

  // Compute activeModal from state
  const activeModal = state.activeModalId
    ? state.modals.find(m => m.id === state.activeModalId) ?? null
    : null;

  const value = useMemo(
    () => ({
      currentScreen,
      currentOverlays,
      currentModals,
      currentPath: state.path,
      skip: skipInContext,
      back: backInContext,
      gotoScreen: gotoScreenInContext,
      openOverlay: openOverlayInContext,
      closeOverlay: closeOverlayInContext,
      closeAllOverlays: closeAllOverlaysInContext,
      activateOverlay: activateOverlayInContext,
      deactivateOverlay: deactivateOverlayInContext,
      activeOverlayIds: activeOverlayIdsArray,
      displayedOverlays: state.overlays,
      displayedModals: state.modals,
      renderedModalEntries,
      activeModalId: state.activeModalId,
      activeModal,
      modalQueue: state.modals,
      openModal: openModalInContext,
      closeModal: closeModalInContext,
      closeAllModals: closeAllModalsInContext,
    }),
    [
      currentScreen,
      currentOverlays,
      currentModals,
      state.path,
      state.overlays,
      state.modals,
      renderedModalEntries,
      activeModal,
      activeOverlayIdsArray,
      skipInContext,
      backInContext,
      gotoScreenInContext,
      openOverlayInContext,
      closeOverlayInContext,
      closeAllOverlaysInContext,
      activateOverlayInContext,
      deactivateOverlayInContext,
      openModalInContext,
      closeModalInContext,
      closeAllModalsInContext,
    ],
  );

  return (
    <ScreenSystemContext.Provider value={value}>
      {children}
    </ScreenSystemContext.Provider>
  );
}
