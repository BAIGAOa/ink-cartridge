import { createContext } from 'react';

/**
 * Context that provides the overlay ID when rendering inside
 * an overlay component. Null when rendering a regular screen.
 *
 * Used by the keyboard system to isolate per-overlay keyboard layers
 * by overlay ID instead of component type (enabling multiple instances
 * of the same component as different overlays).
 */
export const OverlayContext = createContext<string | null>(null);
