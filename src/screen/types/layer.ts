import { LayerElement } from "./element.js";
import { LayerElementInput } from "./element.js";
import { ComponentType } from "react";

/**
 * State shape of a normal (non-modal) layer.
 */
export type Layer = {
  /**
   * The ID of this layer
   */
  layerId: string;
  /**
   * The priority of this layer
   */
  zIndex: number;
  /**
   * Elements included in this layer
   */
  elements: Map<string, LayerElement>;
  /**
   * Normally, when the application executes page-switching methods such as `skip` or `gotoScreen`,
   * the layer is automatically cleared; a toggle is provided here to prevent this automatic clearing.
   */
  crossPage: boolean;
  /**
   * When the z-index values are equal, this field is used to determine the stacking order.
   */
  createdAt: number;

  /**
   * Whether the layer automatically takes over keyboard events, and the
   * scope of that takeover.
   *
   * - `false` (default): no takeover — the bindings stay active on every page.
   * - `true`: the bindings are active only while the layer's host page is the
   *   current page; navigating away pops the keyboard owner and returning to
   *   the host page pushes it again.
   * - `ComponentType<any>[]`: scopes the takeover to the listed pages. While
   *   the current page is one of them, the keyboard owner is popped and the
   *   bindings go dormant; on any other page they stay active.
   *
   * Typically used together with `crossPage` so a persistent layer does not
   * intercept keys on other pages.
   */
  automaticTakeoverKeyboard: boolean | ComponentType<any>[];
  /**
   * The screen that was current in the navigation path when the layer opened.
   * With `automaticTakeoverKeyboard: true`, the bindings stay dormant while
   * this page is not the current one; an array scopes the takeover by listed
   * pages instead.
   */
  hostPage: React.ComponentType<any> | null;
};

/**
 * Options for {@link OpenLayerFn}.
 */
export type LayerOptions = {
  /**
   * Normally, when the application executes page-switching methods such as `skip` or `gotoScreen`,
   * the layer is automatically cleared; a toggle is provided here to prevent this automatic clearing.
   */
  crossPage?: boolean;

  /**
   * Whether the layer automatically takes over keyboard events, and the
   * scope of that takeover.
   *
   * - `false` (default): no takeover — the bindings stay active on every page.
   * - `true`: the bindings are active only while the layer's host page is the
   *   current page; navigating away pops the keyboard owner and returning to
   *   the host page pushes it again.
   * - `ComponentType<any>[]`: scopes the takeover to the listed pages. While
   *   the current page is one of them, the keyboard owner is popped and the
   *   bindings go dormant; on any other page they stay active.
   *
   * Typically used together with `crossPage` so a persistent layer does not
   * intercept keys on other pages.
   */
  automaticTakeoverKeyboard?: boolean | ComponentType<any>[];
};

/**
 * Action dispatched by {@link openLayer}.
 */
export type OpenLayerAction = {
  type: "openLayer";
  /**
   * The ID of this layer;
   * it must be unique among all layers.
   */
  layerId: string;
  /**
   * Regarding priority:
   * a higher value indicates that the element appears visually on top of others;
   * it also signifies a higher priority for keyboard and mouse interactions.
   */
  zIndex: number;

  /**
   * Additional configuration options for this layer:
   * Properties include:
   * 1. crossPage: boolean[default: false]; (allows the layer to persist across pages rather than being automatically cleared)
   * 2. automaticTakeoverKeyboard: boolean | ComponentType<any>[] [default: false]; (see {@link LayerOptions.automaticTakeoverKeyboard})
   */
  options?: LayerOptions;
};

/**
 * Opens a new layer with a unique ID and z-index.
 */
export type OpenLayerFn = (
  layerId: string,
  zIndex: number,
  options?: LayerOptions,
) => void;

/**
 * Action dispatched by {@link applyElement}.
 */
export type ApplyElementAction = {
  type: "applyElement";

  /**
   * Target layer.
   * Must be already registered.
   * If no layer has been registered, you can try calling the `openLayer` method to register it.
   *
   * @example
   * ```tsx
   * const { openLayer } = useScreenSystem();
   *
   * openLayer("layer-1", 1)
   * // This will register a layer with the ID "layer-1" and a priority of 1.
   * ```
   */
  targetLayerId: string;

  /**
   * Elements to be applied to the layer
   * An ID needs to be provided.
   */
  layerElement: LayerElement;
};
/** Applies an element to a registered layer. */
export type ApplyElementFn = <C extends ComponentType<any>>(
  targetLayerId: string,
  layerElement: LayerElementInput<C>,
) => void;

/**
 * Action dispatched by {@link closeLayer}.
 */
export type CloseLayerAction = {
  type: "closeLayer";

  /**
   * The IDs of the layers to be turned off must be already registered.
   */
  targetLayerId: string;
};
/** Closes a registered layer by ID. */
export type CloseLayerFn = (targetLayerId: string) => void;

/**
 * Action dispatched by {@link eraseElement}.
 */
export type EraseElementAction = {
  type: "eraseElement";

  /**
   * The layer ID corresponding to the element to be deleted must be a registered one.
   */
  targetLayerId: string;

  /**
   * The ID of the element to be deleted must correspond to an element that has existed.
   */
  targetElementId: string;
};

/** Removes an element from a registered layer. */
export type EraseElementFn = (
  targetLayerId: string,
  targetElementId: string,
) => void;

/**
 * Action dispatched by {@link activateElement}.
 */
export type ActivateElementAction = {
  type: "activateElement";
  /** ID of the registered layer that owns the target element. */
  targetLayerId: string;
  /** ID of the element to activate. Must already exist on the layer. */
  targetElementId: string;
};

/**
 * Marks a layer element as active (`active: true`). The element will render on
 * the next pass and the keyboard adapter will re-push its owner — effectively
 * reactivating the corresponding keyboard layer without the screen system
 * touching the keyboard engine directly.
 */
export type ActivateElementFn = (
  targetLayerId: string,
  targetElementId: string,
) => void;

export type DeactivateElementAction = {
  type: "deactivateElement";
  /** ID of the registered layer that owns the target element. */
  targetLayerId: string;
  /** ID of the element to deactivate. Must already exist on the layer. */
  targetElementId: string;
};

/**
 * Marks a layer element as inactive (`active: false`). The element is removed
 * from the rendered tree, which triggers the keyboard adapter's owner-stack
 * cleanup (`_popOwner`) — the corresponding keyboard layer goes dormant but
 * its bindings are retained for later reactivation via {@link ActivateElementFn}.
 */
export type DeactivateElementFn = (
  targetLayerId: string,
  targetElementId: string,
) => void;

/**
 * Action dispatched by {@link closeAllLayer}.
 */
export type CloseAllLayerAction = {
  type: "closeAllLayer";
};

/**
 * Closes all layers at once.
 */
export type CloseAllLayerFn = () => void;

/**
 * State shape of a modal layer.
 *
 * Modal layers render above normal layers and take keyboard priority:
 * only the modal layer with the highest z-index receives keyboard events.
 */
export type ModalLayer = {
  /**
   * The ID of the modal layer must be unique
   */
  layerId: string;

  /**
   * The priority of the modal layer.
   * The priority of the modal layer is greater than that of the normal layer.
   * The greater the zIndex of the modal layer,
   * the higher the keyboard priority,
   * and the higher the visual effect.
   * Only the modal layer with the highest zIndex will receive keyboard events.
   */
  zIndex: number;
  /**
   * Elements included in this layer
   */
  elements: Map<string, LayerElement>;
  /**
   * Normally, when the application executes page-switching methods such as `skip` or `gotoScreen`,
   * the layer is automatically cleared; a toggle is provided here to prevent this automatic clearing.
   */
  crossPage: boolean;
  /**
   * When the z-index values are equal, this field is used to determine the stacking order.
   */
  createdAt: number;

  /**
   * Whether the modal layer automatically takes over keyboard events, and
   * the scope of that takeover.
   *
   * - `false` (default): no takeover — the bindings stay active on every page.
   * - `true`: the bindings are active only while the modal layer's host page
   *   is the current page; navigating away pops the keyboard owner and
   *   returning to the host page pushes it again.
   * - `ComponentType<any>[]`: scopes the takeover to the listed pages. While
   *   the current page is one of them, the keyboard owner is popped and the
   *   bindings go dormant; on any other page they stay active.
   *
   * Typically used together with `crossPage` so a persistent modal layer does
   * not intercept keys on other pages.
   */
  automaticTakeoverKeyboard: boolean | ComponentType<any>[];
  /**
   * The screen that was current in the navigation path when the modal layer
   * opened. With `automaticTakeoverKeyboard: true`, the bindings stay dormant
   * while this page is not the current one; an array scopes the takeover by
   * listed pages instead.
   */
  hostPage: React.ComponentType<any> | null;
};

/**
 * Options for {@link OpenModalLayerFn}.
 */
export type ModalLayerOptions = {
  /**
   * Normally, when the application executes page-switching methods such as `skip` or `gotoScreen`,
   * the layer is automatically cleared; a toggle is provided here to prevent this automatic clearing.
   */
  crossPage?: boolean;

  /**
   * Whether the modal layer automatically takes over keyboard events, and
   * the scope of that takeover.
   *
   * - `false` (default): no takeover — the bindings stay active on every page.
   * - `true`: the bindings are active only while the modal layer's host page
   *   is the current page; navigating away pops the keyboard owner and
   *   returning to the host page pushes it again.
   * - `ComponentType<any>[]`: scopes the takeover to the listed pages. While
   *   the current page is one of them, the keyboard owner is popped and the
   *   bindings go dormant; on any other page they stay active.
   *
   * Typically used together with `crossPage` so a persistent modal layer does
   * not intercept keys on other pages.
   */
  automaticTakeoverKeyboard?: boolean | ComponentType<any>[];
};

/**
 * Action dispatched by {@link openModalLayer}.
 */
export type OpenModalLayerAction = {
  type: "openModalLayer";

  /**
   * The ID of this layer, which must be unique
   */
  layerId: string;

  /**
   * The priority of the modal layer.
   * The higher the value, the more overlaid the visual effect,
   * and the higher the keyboard priority.
   */
  zIndex: number;

  /**
   * Additional configuration options for this layer:
   * Properties include:
   * 1. crossPage: boolean[default: false]; (allows the layer to persist across pages rather than being automatically cleared)
   * 2. automaticTakeoverKeyboard: boolean | ComponentType<any>[] [default: false]; (see {@link ModalLayerOptions.automaticTakeoverKeyboard})
   */
  options?: ModalLayerOptions;
};

/**
 * Opens a new modal layer with a unique ID and z-index.
 */
export type OpenModalLayerFn = (
  layerId: string,
  zIndex: number,
  options?: ModalLayerOptions,
) => void;

/**
 * Action dispatched by {@link applyElementToModalLayer}.
 */
export type ApplyElementToModalLayerAction = {
  type: "applyElementToModalLayer";

  /**
   * Target layer.
   * Must be already registered.
   * If no layer has been registered, you can try calling the `openLayer` method to register it.
   *
   * @example
   * ```tsx
   * const { openModalLayer } = useScreenSystem();
   *
   * openModalLayer("ModalLayer-1", 1)
   * // This will register a layer with the ID "ModalLayer-1" and a priority of 1.
   * ```
   */
  targetModalLayerId: string;

  /**
   * Elements to be applied to the layer
   * An ID needs to be provided.
   */
  modalLayerElement: LayerElement;
};

/** Applies an element to a registered layer. */
export type ApplyElementToModalLayerFn = <C extends ComponentType<any>>(
  targetModalLayerId: string,
  modalLayerElement: LayerElementInput<C>,
) => void;

/**
 * Action dispatched by {@link closeModalLayer}.
 */
export type CloseModalLayerAction = {
  type: "closeModalLayer";

  /**
   * The IDs of the layers to be turned off must be already registered.
   */
  targetModalLayerId: string;
};
/** Closes a registered layer by ID. */
export type CloseModalLayerFn = (targetModalLayerId: string) => void;

/**
 * Action dispatched by {@link eraseElementInModalLayer}.
 */
export type EraseElementInModalLayerAction = {
  type: "eraseElementInModalLayer";

  /**
   * The layer ID corresponding to the element to be deleted must be a registered one.
   */
  targetModalLayerId: string;

  /**
   * The ID of the element to be deleted must correspond to an element that has existed.
   */
  targetElementId: string;
};

/** Removes an element from a registered layer. */
export type EraseElementInModalLayerFn = (
  targetLayerId: string,
  targetElementId: string,
) => void;

export type ActivateElementInModalLayerAction = {
  type: "activateElementInModalLayer";
  /** ID of the registered modal layer that owns the target element. */
  targetModalLayerId: string;
  /** ID of the element to activate. Must already exist on the modal layer. */
  targetElementId: string;
};

/**
 * Modal-layer counterpart of {@link ActivateElementFn}. Marks a modal-layer
 * element as active so the keyboard adapter re-pushes the modal's owner and
 * restores keyboard handling.
 */
export type ActivateElementInModalLayerFn = (
  targetModalLayerId: string,
  targetElementId: string,
) => void;

export type DeactivateElementInModalLayerAction = {
  type: "deactivateElementInModalLayer";
  /** ID of the registered modal layer that owns the target element. */
  targetModalLayerId: string;
  /** ID of the element to deactivate. Must already exist on the modal layer. */
  targetElementId: string;
};

/**
 * Modal-layer counterpart of {@link DeactivateElementFn}. Marks a modal-layer
 * element as inactive so it unmounts, triggering the keyboard adapter's
 * `_popOwner` cleanup and putting the modal's keyboard layer dormant.
 */
export type DeactivateElementInModalLayerFn = (
  targetModalLayerId: string,
  targetElementId: string,
) => void;

/**
 * Action dispatched by {@link closeAllModalLayer}.
 */
export type CloseAllModalLayerAction = {
  type: "closeAllModalLayer";
};

/**
 * Closes all modal layers at once.
 */
export type CloseAllModalLayerFn = () => void;
