/**
 * Event object passed to the {@link ModalMissCallback}.
 *
 * When `miss` is `false`, the key was handled (by a binding, Tab
 * navigation, sequence, or — depending on options — stop/penetration).
 * When `miss` is `true`, the remaining fields describe the key that
 * was not handled by any mechanism visible to the miss detector.
 */
export type ModalMissEvent =
  | { miss: false }
  | { miss: true; key: unknown; input: string; eventNames: string[] };

/**
 * Callback signature for {@link useModalMissListener}.
 */
export type ModalMissCallback = (evt: ModalMissEvent) => void;