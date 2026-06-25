/**
 * Props accepted by the {@link DevScreen} debugging overlay.
 */
export interface DevProps {
  /** Vertical position in rows — 0 is the top of the terminal. */
  top: number
  /** Horizontal position in columns — 0 is the left edge. */
  left: number

  zindex?: number
}

/**
 * Props accepted by the {@link GlobalKeyDisplayBox} global-keys inspector modal.
 *
 * Opened via `Ctrl+G` while the {@link DevScreen} modal is active. Renders as
 * a white-bordered panel listing all registered global key bindings with
 * expandable detail cards.
 */
export interface GlobalProps {
  /** Vertical position in rows — 0 is the top of the terminal. */
  top: number
  /** Horizontal position in columns — 0 is the left edge. */
  left: number
}
