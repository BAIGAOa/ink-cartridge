import { ComponentProps, ComponentType } from "react"

/**
 * An element stored in a layer.
 *
 * Holds the element component, its props, and its keyboard-active flag.
 */
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
     * omitted. Toggled via `activateElement`/`deactivateElement`
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

    /**
     * Props passed to the element when it is rendered. Stored as a plain
     * record; type safety lives at the `applyElement` call site, which
     * narrows `props` to the element component's own prop type.
     */
    props?: Record<string, unknown>
}

/**
 * Type-safe input for {@link ApplyElementFn}/{@link ApplyElementToModalLayerFn}.
 *
 * Mirrors how `skip()` accepts `params: ComponentProps<C>` — the props type
 * is inferred from the element component, so passing a prop the component
 * does not declare is a compile error.
 */
export type LayerElementInput<C extends ComponentType<any>> = Omit<
    LayerElement,
    "element" | "props"
> & {
    element: C
    props?: ComponentProps<C>
}
