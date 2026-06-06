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
 * Internal state of the screen management provider.
 */
export interface ScreenState {
  /** The full navigation path from the root component to the current screen. */
  path: React.ComponentType<any>[];
  /** Parameters for each component along the path, in the same order. */
  pathParams: Record<string, unknown>[];
  /** The currently active overlay, or null if none is open. */
  overlay: {
    component: React.ComponentType<any>;
    params: Record<string, unknown>;
  } | null;
  /** Auto-incrementing counter used as a React key to force remounts when needed. */
  counter: number;
}

/** Discriminated union type discriminator. */
export type ScreenActionType = 'skip' | 'back' | 'gotoScreen' | 'overlay' | 'closeOverlay';

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

/** Action dispatched when opening an overlay on top of the current screen. */
export interface OverlayAction {
  type: 'overlay';
  /** The overlay component to render. */
  component: React.ComponentType<any>;
  /** Props to pass to the overlay component. */
  params: Record<string, unknown>;
}

/** Action dispatched when closing the currently active overlay. */
export interface CloseOverlayAction {
  type: 'closeOverlay';
}

/** Union of all possible screen actions. */
export type ScreenAction =
  | SkipAction
  | BackAction
  | GotoScreenAction
  | OverlayAction
  | CloseOverlayAction;

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
 * Function signature for opening an overlay on top of the current screen.
 *
 * @typeParam C - The overlay component type.
 * @param component - The overlay component (must be registered).
 * @param params - Props to pass to the overlay.
 */
export type OverlayFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
) => void;

/** Function signature for closing the currently active overlay. */
export type CloseOverlayFn = () => void;