import { createContext } from 'react';

/**
 * Context that provides the modal ID when rendering inside
 * a modal component. Null when rendering a regular screen.
 *
 * Used by the keyboard system to isolate per-modal keyboard layers
 * by modal ID instead of component type (enabling multiple instances
 * of the same component as different modals).
 *
 * Architecturally symmetric to {@link OverlayContext}.
 */
export const ModalContext = createContext<string | null>(null);
