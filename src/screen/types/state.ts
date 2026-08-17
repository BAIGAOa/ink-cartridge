import { Layer, ModalLayer } from "./layer.js";
import { Page } from "./page.js";

/**
 * Internal state of the screen management provider.
 */
export interface ScreenState {
	/** The full navigation path from the root component to the current screen. */
	path: Page[];
	/** Parameters for each component along the path, in the same order. */
	pathParams: Record<string, unknown>[];
	/**
	 * All layers, sorted by z-index.
	 */
	allLayers: Layer[];
    /**
     * Modal layers always have higher priority than standard layers and page layers.
     */
    allModalLayers: ModalLayer[];
	/** Auto-incrementing counter used as a React key to force remounts when needed. */
	counter: number;
}
