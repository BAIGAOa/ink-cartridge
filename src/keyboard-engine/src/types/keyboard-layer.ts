
/**
 * Layer data required by the keyboard
 * You can extend this type by inheriting from it within the framework.
 */
export interface KyeboardLayer {
    /**
     * The ID of this layer; must be unique among all layers.
     */
    layerId: string
    /**
     * For all elements currently on this layer, 
     * the keyboard system will create a separate keyboard data layer for each of them.
     */
    elements: string[]

    /**
     * At this moment, among all elements on this layer, 
     * only the active ones will receive keyboard and mouse events.
     */
    activeElements: string[]
}