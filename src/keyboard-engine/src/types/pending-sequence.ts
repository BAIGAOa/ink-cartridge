import { KeyHandler, BaseSequenceBinding } from "./binding.js";
import { ResolvedGlobalSequenceEntry } from "./entry.js";
import { SequenceOptions } from "./options.js";

/**
 * Internal representation of a sequence that is currently being matched.
 *
 * Created when the first key of a registered `SequenceBinding` is pressed
 * and stored on the layer's {@link ScreenKeyboardLayer.pendingSequence}.
 * Tracked by a `timer` that cancels the pending state if the next key
 * does not arrive within `timeout` milliseconds.
 */
export interface PendingSequence {
  /** The full key sequence to match (copied from `SequenceBinding.keys`). */
  sequences: string[];
  /**
   * Index of the next key to match within `sequences`.
   * Starts at 1 after the first key is consumed.
   */
  nextIndex: number;
  /** Callback to invoke when the full sequence is matched. */
  handler: KeyHandler;
  /** The timeout timer handle; cleared on match, mismatch, or cancellation. */
  timer: NodeJS.Timeout;
  /** Timeout duration in milliseconds. */
  timeout: number;
  /** Options from the original `SequenceBinding`. */
  options?: SequenceOptions;
  /**
   * Optional condition callback (copied from SequenceBinding at start).
   * Checked at each key press; if it returns `false`, the sequence is cancelled.
   */
  when?: (() => boolean) | string;
  /**
   * When multiple sequences share the same first key (non-exclusive
   * mode), stores all eligible {@link BaseSequenceBinding} candidates so
   * that subsequent keys can disambiguate. Set to `undefined` once
   * the pending sequence resolves to a single binding, or in exclusive
   * mode where only the first candidate is kept.
   */
  candidates?: BaseSequenceBinding[];
}

/**
 * Internal state for a global multi-key sequence that is currently being
 * matched across consecutive key presses.
 *
 * Created by the global sequence processor when the first key of a
 * registered {@link GlobalSequenceEntry} matches, and consumed when the
 * full sequence completes or times out.
 */
export interface GlobalPendingSequence {
  sequences: string[];
  nextIndex: number;
  handler: () => void;
  timer: ReturnType<typeof setTimeout>;
  timeout: number;
  exclusive: boolean;
  affectOverlay: boolean;
  cover: boolean;
  category?: unknown[] | "*";
  executeWhenNoOverlay?: boolean;
  when?: (() => boolean) | string;
  /**
   * When multiple global sequences share the same first key (non-exclusive
   * mode), stores all eligible {@link ResolvedGlobalSequenceEntry} candidates
   * so that subsequent keys can disambiguate. Set to `undefined` once the
   * pending sequence resolves to a single binding, or in exclusive mode
   * where only the first candidate is kept.
   */
  candidates?: ResolvedGlobalSequenceEntry[];
}
