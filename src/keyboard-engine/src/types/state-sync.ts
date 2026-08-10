import { KeyboardLayer } from "./keyboard-layer.js";

/**
 * State snapshot pushed by the host framework on every engine sync.
 *
 * The keyboard engine uses it to keep the screen path, layers, and
 * modal layers in sync with the host's navigation state.
 */
export type SyncState<TComponent> = {
  /**
   * The screen path to transmit; used by the keyboard system to
   * identify the current page.
   */
  pagePath: TComponent[];
  /**
   * All non-modal layers currently on the screen.
   * Layers appearing later in the array have higher keyboard priority.
   */
  layers: KeyboardLayer[];
  /**
   * All modal layers currently on the screen. Keyboard and mouse events
   * for modal layers always take precedence over those for pages and
   * ordinary layers.
   */
  modalLayers: KeyboardLayer[];
};
