import { ComponentType } from "react"

export type LayerElement = {
    /**
     * The ID of this element; 
     * it must be unique within the layer containing the element.
     */
    elementId: string

    /**
     * Elements to be applied to the layer
     */
    element: ComponentType<any>
}