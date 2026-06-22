import React from 'react';

export interface RegisterOptions {
  /**
   * The parent component in the navigation tree.
   * If not provided, the component is considered a root candidate.
   */
  parent?: React.ComponentType<any>;
}

export interface SkipOptions {
  /**
   * When true, only the component's props are updated without remounting the component.
   * This is useful for performance or when preserving internal state.
   */
  onlyAttribute?: boolean;
}

/**
 * Options for {@link openOverlay}.
 */
export interface OpenOverlayOptions {
  /** Whether to activate the overlay immediately. Defaults to true. */
  activate?: boolean;
  /** Visual stacking order. Smaller values render behind larger values. */
  zIndex?: number;
}

/**
 * Options for {@link openModal}.
 */
export interface OpenModalOptions {
  /** Visual stacking order. Smaller values render behind larger values. Defaults to the current modal count. */
  zIndex?: number;
  /** Whether to render the modal even when it is not the active modal (zIndex not highest). Defaults to false. */
  renderNow?: boolean;
}

/**
 * A single overlay entry in the multi-overlay system.
 */
export interface OverlayEntry {
  /** Unique identifier for this overlay. */
  id: string;
  /** The overlay component to render. */
  component: React.ComponentType<any>;
  /** Props passed to the overlay component. */
  props: Record<string, unknown>;
  /** Visual stacking order (lower = behind, higher = front). */
  zIndex: number;
  /** Timestamp for tie-breaking when zIndex values are equal. */
  createdAt: number;
}

/**
 * A single modal entry in the modal system.
 *
 * Modals are architecturally symmetric to overlays but with absolute
 * keyboard priority: the modal with the highest zIndex is the single
 * active modal and consumes all keyboard events.
 */
export interface ModalEntry {
  /** Unique identifier for this modal. */
  id: string;
  /** The modal component to render. */
  component: React.ComponentType<any>;
  /** Props passed to the modal component. */
  props: Record<string, unknown>;
  /** Visual stacking order (lower = behind, higher = front). Also determines activation order. */
  zIndex: number;
  /** Timestamp for tie-breaking when zIndex values are equal. */
  createdAt: number;
  /** Whether to render even when not the active modal. Defaults to false. */
  renderNow: boolean;
}

/**
 * Internal state of the screen management provider.
 */
export interface ScreenState {
  /** The full navigation path from the root component to the current screen. */
  path: React.ComponentType<any>[];
  /** Parameters for each component along the path, in the same order. */
  pathParams: Record<string, unknown>[];
  /** All open overlays, sorted by zIndex (ascending). */
  overlays: OverlayEntry[];
  /** Set of overlay IDs that are currently active (receiving keyboard events). */
  activeOverlayIds: Set<string>;
  /** All open modals, sorted by zIndex (ascending). */
  modals: ModalEntry[];
  /** ID of the currently active modal (zIndex highest), or null if none. */
  activeModalId: string | null;
  /** Auto-incrementing counter used as a React key to force remounts when needed. */
  counter: number;
}

/** Discriminated union type discriminator. */
export type ScreenActionType =
  | 'skip'
  | 'back'
  | 'gotoScreen'
  | 'openOverlay'
  | 'closeOverlay'
  | 'closeAllOverlays'
  | 'activateOverlay'
  | 'deactivateOverlay'
  | 'openModal'
  | 'closeModal'
  | 'closeAllModals';

/** Action dispatched when navigating down to a child screen. */
export interface SkipAction {
  type: 'skip';
  /** The target component to navigate to. */
  component: React.ComponentType<any>;
  /** Props to merge with the component's registered template. */
  params: Record<string, unknown>;
  /** Whether to only update props without remounting. */
  onlyAttribute: boolean;
}

/** Action dispatched when navigating back to the parent screen. */
export interface BackAction {
  type: 'back';
  /** Number of levels to go back. Defaults to 1. */
  levels?: number;
}

/** Action dispatched when jumping to any registered screen across branches. */
export interface GotoScreenAction {
  type: 'gotoScreen';
  /** The target component to navigate to. */
  component: React.ComponentType<any>;
  /** Props to merge with the component's registered template. */
  params: Record<string, unknown>;
}

/** Action dispatched when opening a new overlay. */
export interface OpenOverlayAction {
  type: 'openOverlay';
  /** Unique identifier for this overlay. */
  id: string;
  /** The overlay component to render. */
  component: React.ComponentType<any>;
  /** Props to pass to the overlay component. */
  params: Record<string, unknown>;
  /** Whether to activate the overlay immediately. */
  activate: boolean;
  /** Optional zIndex for visual stacking. */
  zIndex?: number;
}

/** Action dispatched when closing a specific overlay by ID. */
export interface CloseOverlayAction {
  type: 'closeOverlay';
  /** The ID of the overlay to close. */
  id: string;
}

/** Action dispatched when closing all overlays. */
export interface CloseAllOverlaysAction {
  type: 'closeAllOverlays';
}

/** Action dispatched when activating an overlay by ID. */
export interface ActivateOverlayAction {
  type: 'activateOverlay';
  /** The ID of the overlay to activate. */
  id: string;
}

/** Action dispatched when deactivating an overlay by ID. */
export interface DeactivateOverlayAction {
  type: 'deactivateOverlay';
  /** The ID of the overlay to deactivate. */
  id: string;
}

/** Action dispatched when opening a new modal. */
export interface OpenModalAction {
  type: 'openModal';
  /** Unique identifier for this modal. */
  id: string;
  /** The modal component to render. */
  component: React.ComponentType<any>;
  /** Props to pass to the modal component. */
  params: Record<string, unknown>;
  /** Optional zIndex for visual stacking and activation order. */
  zIndex?: number;
  /** Whether to render even when not active. Defaults to false. */
  renderNow?: boolean;
}

/** Action dispatched when closing a specific modal by ID. */
export interface CloseModalAction {
  type: 'closeModal';
  /** The ID of the modal to close. */
  id: string;
}

/** Action dispatched when closing all modals. */
export interface CloseAllModalsAction {
  type: 'closeAllModals';
}

/** Union of all possible screen actions. */
export type ScreenAction =
  | SkipAction
  | BackAction
  | GotoScreenAction
  | OpenOverlayAction
  | CloseOverlayAction
  | CloseAllOverlaysAction
  | ActivateOverlayAction
  | DeactivateOverlayAction
  | OpenModalAction
  | CloseModalAction
  | CloseAllModalsAction;

/**
 * Function signature for navigating to a direct child of the current screen.
 *
 * @typeParam C - The component type (must be a React component).
 * @param component - The child component (must be registered and a direct child).
 * @param params - Props to pass to the component.
 * @param options - Optional navigation flags.
 */
export type SkipFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions,
) => void;

/** Function signature for navigating back to the parent screen. */
export type BackFn = (levels?: number) => void;

/**
 * Function signature for jumping to any registered screen across branches.
 *
 * @typeParam C - The target component type.
 * @param component - The target component (must be registered).
 * @param params - Props to pass to the component.
 */
export type GotoScreenFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
) => void;

/**
 * Function signature for opening a new overlay.
 *
 * @typeParam C - The overlay component type.
 * @param id - Unique identifier for this overlay.
 * @param component - The overlay component (must be registered).
 * @param params - Props to pass to the overlay.
 * @param options - Optional activation and zIndex settings.
 */
export type OpenOverlayFn = <C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenOverlayOptions,
) => void;

/** Function signature for closing a specific overlay by ID. */
export type CloseOverlayFn = (id: string) => void;

/** Function signature for closing all overlays. */
export type CloseAllOverlaysFn = () => void;

/** Function signature for activating an overlay by ID. */
export type ActivateOverlayFn = (id: string) => void;

/** Function signature for deactivating an overlay by ID. */
export type DeactivateOverlayFn = (id: string) => void;

/**
 * Function signature for opening a new modal.
 *
 * @typeParam C - The modal component type.
 * @param id - Unique identifier for this modal.
 * @param component - The modal component (must be registered).
 * @param params - Props to pass to the modal.
 * @param options - Optional zIndex and renderNow settings.
 */
export type OpenModalFn = <C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenModalOptions,
) => void;

/** Function signature for closing a specific modal by ID. */
export type CloseModalFn = (id: string) => void;

/** Function signature for closing all modals. */
export type CloseAllModalsFn = () => void;
