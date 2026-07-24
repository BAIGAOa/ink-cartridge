import { LayerElement } from "./element.js";

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
	 * When the z-index values ​​are equal, this field is used to determine the stacking order.
	 */
	createdAt: number;
};

export type LayerOptions = {
	/**
	 * Normally, when the application executes page-switching methods such as `skip` or `gotoScreen`,
	 * the layer is automatically cleared; a toggle is provided here to prevent this automatic clearing.
	 */
	crossPage?: boolean;
};

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
	 */
	options?: LayerOptions
};

export type OpenLayerFn = (layerId: string, zIndex: number, options?: LayerOptions) => void


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
    targetLayerId: string

	/**
	 * Elements to be applied to the layer
	 * An ID needs to be provided.
	 */
	layerElement: LayerElement
}
/** Applies an element to a registered layer. */
export type ApplyElementFn = (targetLayerId: string, layerElement: LayerElement) => void

export type CloseLayerAction = {
	type: "closeLayer"

	/**
	 * The IDs of the layers to be turned off must be already registered.
	 */
	targetLayerId: string
}
/** Closes a registered layer by ID. */
export type CloseLayerFn = (targetLayerId: string) => void

export type EraseElementAction = {
	type: "eraseElement"

	/**
	 * The layer ID corresponding to the element to be deleted must be a registered one.
	 */
	targetLayerId: string

	/**
	 * The ID of the element to be deleted must correspond to an element that has existed.
	 */
	targetElementId: string
}

/** Removes an element from a registered layer. */
export type EraseElementFn = (targetLayerId: string, targetElementId: string) => void

export type CloseAllLayerAction = {
	type: "closeAllLayer"
}

export type CloseAllLayerFn = () => void
