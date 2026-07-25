import { createContext, ReactNode } from 'react';
import type {
  SkipFn,
  BackFn,
  GotoScreenFn,
} from './types.js';
import {
  ApplyElementFn,
  ApplyElementToModalLayerFn,
  CloseAllLayerFn,
  CloseAllModalLayerFn,
  CloseLayerFn,
  CloseModalLayerFn,
  EraseElementFn,
  EraseElementInModalLayerFn,
  Layer,
  ModalLayer,
  OpenLayerFn,
  OpenModalLayerFn,
} from './types/layer.js';

/**
 * Value provided by {@link ScenarioManagementProvider} via React context.
 *
 * Includes the current screen, all active overlays, navigation functions,
 * overlay management functions, and modal management functions.
 */
export interface ScreenSystemContextValue {
  /** The rendered React element for the current (top-of-stack) screen. */
  pageLayer: ReactNode;
  /** Full navigation path from root to the current screen. */
  currentPath: React.ComponentType<any>[];
  /** All layers */
  allLayers: Layer[]
  /** All modal layers */
  allModalLayers: ModalLayer[]
  /** Navigate down the tree to a direct child of the current screen. */
  skip: SkipFn;
  /** Navigate up the tree toward the root. */
  back: BackFn;
  /** Jump to any registered screen across branches via LCA resolution. */
  gotoScreen: GotoScreenFn;
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

  /** Opens a new modal layer with a unique ID and z-index. */
  openModalLayer: OpenModalLayerFn
  /** Applies an element to a registered modal layer. */
  applyElementToModalLayer: ApplyElementToModalLayerFn
  /** Closes a registered modal layer by its ID. */
  closeModalLayer: CloseModalLayerFn
  /** Removes an element from a registered modal layer. */
  eraseElementInModalLayer: EraseElementInModalLayerFn
  /** Closes all modal layers at once. */
  closeAllModalLayer: CloseAllModalLayerFn
}

/**
 * React context for the screen navigation system.
 *
 * Accessed via {@link useScreenSystem}. Must be provided by a
 * {@link ScenarioManagementProvider} at the root of the component tree.
 */
export const ScreenSystemContext =
  createContext<ScreenSystemContextValue | null>(null);
