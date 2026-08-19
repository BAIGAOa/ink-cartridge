/**
 * Signal that the key was handled by some mechanism visible to the miss
 * detector (a binding, Tab navigation, a sequence, or — depending on
 * options — stop/penetration), so no miss occurred.
 */
export interface ModalMissHandledEvent {
  /** Always `false` — the key was handled, no miss. */
  miss: false;
}

/**
 * Signal that the key was NOT handled by any mechanism visible to the
 * miss detector — a miss. The remaining fields describe the key.
 */
export interface ModalMissUnhandledEvent {
  /** Always `true` — the key was not handled. */
  miss: true;
  /** The raw key descriptor object (Ink's `useInput` second argument). */
  key: unknown;
  /** The raw input string from the terminal (empty for special keys). */
  input: string;
  /** Normalized key names for the key (e.g. `"s"`, `"ctrl+q"`). */
  eventNames: string[];
}

/**
 * Event object passed to the {@link ModalMissCallback}.
 *
 * When `miss` is `false`, the key was handled (by a binding, Tab
 * navigation, sequence, or — depending on options — stop/penetration).
 * When `miss` is `true`, the remaining fields describe the key that
 * was not handled by any mechanism visible to the miss detector.
 */
export type ModalMissEvent = ModalMissHandledEvent | ModalMissUnhandledEvent;

/**
 * Callback signature for `useModalMissListener`.
 */
export type ModalMissCallback = (evt: ModalMissEvent) => void;