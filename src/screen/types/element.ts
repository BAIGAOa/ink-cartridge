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

    /**
     * Whether this element is currently active. Defaults to `true` when
     * omitted. Toggled via {@link activateElement}/{@link deactivateElement}
     * (or their modal equivalents).
     *
     * This flag has nothing to do with React rendering — the element stays
     * mounted either way. It is consumed by the keyboard engine: when an
     * element is deactivated, its `elementId` is removed from the layer's
     * `activeElements` set, so the keyboard engine stops dispatching key
     * events to that element's bindings while keeping all registration
     * data intact for a later reactivation.
     */
    active?: boolean
}