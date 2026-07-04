import { createContext } from 'react';

/**
 * Context that provides the overlay ID and origin component when rendering
 * inside an overlay component. Null when rendering a regular screen.
 *
 * The {@link originComponent} field is set only for persistent overlays —
 * it tracks which screen opened the overlay and enables automatic keyboard
 * layer push/pop as the user navigates between screens.
 *
 * Used by the keyboard system to isolate per-overlay keyboard layers
 * by overlay ID instead of component type (enabling multiple instances
 * of the same component as different overlays).
 *
 * Architecturally symmetric to {@link ModalContext}.
 */
export const OverlayContext = createContext<{
  /** Unique overlay identifier. */
  id: string;
  /** Screen that opened this overlay (set only when persistent). */
  originComponent?: React.ComponentType<any>;
} | null>(null);
