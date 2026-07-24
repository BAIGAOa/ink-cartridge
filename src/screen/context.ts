import { createContext, ReactNode } from 'react';
import type {
  SkipFn,
  BackFn,
  GotoScreenFn,
  OpenModalFn,
  CloseModalFn,
  CloseAllModalsFn,
  ModalEntry,
} from './types.js';
import { ApplyElementFn, CloseAllLayerFn, CloseLayerFn, EraseElementFn, Layer, OpenLayerFn } from './types/layer.js';

/**
 * Value provided by {@link ScenarioManagementProvider} via React context.
 *
 * Includes the current screen, all active overlays, navigation functions,
 * overlay management functions, and modal management functions.
 */
export interface ScreenSystemContextValue {
  /** The rendered React element for the current (top-of-stack) screen. */
  pageLayer: ReactNode;
  /** Rendered React elements for all modals, sorted by zIndex ascending. */
  currentModals: ReactNode[];
  /** Full navigation path from root to the current screen. */
  currentPath: React.ComponentType<any>[];
  /** All layers */
  allLayers: Layer[]
  /** Navigate down the tree to a direct child of the current screen. */
  skip: SkipFn;
  /** Navigate up the tree toward the root. */
  back: BackFn;
  /** Jump to any registered screen across branches via LCA resolution. */
  gotoScreen: GotoScreenFn;
  /** All open modals with metadata (id, zIndex, etc.), sorted by zIndex ascending. */
  displayedModals: ModalEntry[];
  /** The modal entries that correspond to the rendered modal nodes (active + renderNow). Sorted by zIndex ascending. */
  renderedModalEntries: ModalEntry[];
  /** ID of the currently active modal (zIndex highest), or null if none. */
  activeModalId: string | null;
  /** The currently active modal entry (zIndex highest), or null if none. */
  activeModal: ModalEntry | null;
  /** All open modals sorted by zIndex ascending. */
  modalQueue: ModalEntry[];
  /** Open a new modal with a unique ID. */
  openModal: OpenModalFn;
  /** Close a specific modal by its ID. */
  closeModal: CloseModalFn;
  /** Close all open modals at once. */
  closeAllModals: CloseAllModalsFn;
  /** Whether to turn on full screen effect */
  fullScreen?: boolean;

  /** Opens a new layer with a unique ID and z-index. */
  openLayer: OpenLayerFn
  /** Applies an element to a registered layer. */
  applyElement: ApplyElementFn
  /** Closes a registered layer by its ID. */
  closeLayer: CloseLayerFn
  /** Removes an element from a registered layer. */
  eraseElement: EraseElementFn
  /** Closes all layers at once. */
  closeAllLayer: CloseAllLayerFn
}

/**
 * React context for the screen navigation system.
 *
 * Accessed via {@link useScreenSystem}. Must be provided by a
 * {@link ScenarioManagementProvider} at the root of the component tree.
 */
export const ScreenSystemContext =
  createContext<ScreenSystemContextValue | null>(null);
