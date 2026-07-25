import { KyeboardLayer } from "./keyboard-layer.js"

export type SyncState<TComponent> = {
    /**
     * The screen path to be transmitted; this will be used by the keyboard system to identify the current page.
     */
    pagePath: TComponent[]
    /**
     * All layers currently on the screen. 
     * Note: Layers appearing later in the array have higher keyboard priority.
     */
    layers: KyeboardLayer[]
    /**
     * Regarding all modal layers at this moment—note that keyboard 
     * and mouse events for modal layers always take precedence over those for `pageLayer` and `layer`.
     */
    modalLayers: KyeboardLayer[]
}