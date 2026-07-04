import { createContext } from 'react';

/**
 * Context that provides the modal ID and origin component when rendering
 * inside a modal component. Null when rendering a regular screen.
 *
 * The {@link originComponent} field is set only for persistent modals —
 * it tracks which screen opened the modal and enables automatic keyboard
 * layer push/pop as the user navigates between screens.
 *
 * Used by the keyboard system to isolate per-modal keyboard layers
 * by modal ID instead of component type (enabling multiple instances
 * of the same component as different modals).
 *
 * Architecturally symmetric to {@link OverlayContext}.
 */
export const ModalContext = createContext<{
  /** Unique modal identifier. */
  id: string;
  /** Screen that opened this modal (set only when persistent). */
  originComponent?: React.ComponentType<any>;
} | null>(null);
