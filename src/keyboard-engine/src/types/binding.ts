import { SequenceOptions } from "./options.js";

/**
 * Keyboard callback, matching Ink's `useInput` signature.
 *
 * @param input  The raw character string (empty for special keys).
 * @param key    The key descriptor (booleans for special keys, modifiers).
 */
export type KeyHandler = (input: string, key: unknown) => void;



/**
 * A single key-binding entry stored on a screen layer or focus target.
 */
export interface BoundKeyEntry {
  /** Normalized key names to match. */
  keys: string[];
  /** Handler to invoke on match. */
  handler: KeyHandler;
  /** Number of presses needed before the handler fires (from options). */
  times?: number;
  /** Current press count. Managed internally by the keyboard provider. */
  pressCount?: number;
  /**
   * Optional condition callback. When provided, the binding only fires if
   * this callback returns `true` at the moment of the key press.
   *
   * When `false`, the binding is skipped as if it does not exist — the
   * event continues to the next binding or layer.
   */
  when?: (() => boolean) | string;
  /**
   * Callback invoked on every key press while counting toward `times`.
   * Receives the number of remaining presses before the handler fires.
   * Requires `times` to be set; throws at registration otherwise.
   */
  observer?: (remaining: number) => void;
  /**
   * Restrict this binding to a specific mode.
   *
   * Copied from {@link BoundKeyboardOptions.mode} at registration time.
   * Checked by {@link tryMatchBindings} before `when`, `onlyThis`, and
   * key-match evaluation. When the active mode does not match, the binding
   * is skipped entirely.
   */
  mode?: string;
}


/**
 * A registered multi-key sequence binding.
 *
 * Stored in {@link ScreenKeyboardLayer.sequences}, keyed by the first
 * key in the sequence. When that key is pressed and no other sequence
 * is already pending, the layer enters a pending state waiting for the
 * remaining keys.
 */
export interface SequenceBinding {
  /**
   * Ordered key names making up the full sequence.
   * Must have length ≥ 2 (the first key is the lookup key in the map).
   */
  keys: string[];

  /** Callback to invoke when the full sequence is matched. */
  handler: KeyHandler;
  /**
   * Per-binding timeout override (ms). Falls back to the global
   * `DEFAULT_SEQUENCE_TIMEOUT` (500 ms) when omitted.
   */
  timeout?: number;

  /** Binding options (exclusive mode, focusId, onlyThis, etc.). */
  options?: SequenceOptions;
  /**
   * Optional condition callback (extracted from options.when at registration).
   * When provided, the sequence only starts and continues when this returns `true`.
   */
  when?: (() => boolean) | string;
}
