import type { EventEmitter } from 'node:events';
import type { ReadableStreamWithEncoding } from './index.js';

/**
 * Configuration options for the Mouse class.
 * All properties are optional and provide sensible defaults.
 */
export type MouseOptions = {
  /**
   * The event emitter to use for emitting mouse events.
   * Defaults to a new EventEmitter instance.
   */
  emitter?: EventEmitter;

  /**
   * The readable stream to listen for mouse events on.
   * Defaults to `process.stdin`.
   */
  inputStream?: ReadableStreamWithEncoding;

  /**
   * The writable stream to send control sequences to.
   * Defaults to `process.stdout`.
   */
  outputStream?: NodeJS.WriteStream;

  /**
   * Custom function to set raw mode on the input stream.
   * If not provided, defaults to `inputStream.setRawMode`.
   *
   * This is useful for testing or for custom terminal behavior.
   */
  setRawMode?: (mode: boolean) => void;

  /**
   * Maximum allowed distance (in cells) between press and release to qualify as a click.
   * Defaults to 1, meaning the press and release must be within 1 cell in both X and Y directions.
   * Set to 0 to require exact same position, or higher values to allow more movement.
   */
  clickDistanceThreshold?: number;

  /**
   * Consecutive `press` events with no `release` in between that trigger
   * degraded "press-is-click" mode. Some terminals (e.g. VS Code's built-in
   * terminal) stop reporting releases after multiple buttons are pressed
   * simultaneously; without this fallback clicks would never be synthesized
   * there. Defaults to 3. Set to `Infinity` to disable degraded mode.
   */
  pressStormThreshold?: number;

  /**
   * How long (ms) presses are allowed to span while still counting toward
   * `pressStormThreshold`. A press arriving after this window restarts the
   * count. Defaults to 500. This prevents a slow multi-button press on a
   * well-behaved terminal from spuriously entering degraded mode. Set to
   * `Infinity` to count presses without any time limit.
   */
  pressStormWindowMs?: number;

  /**
   * In degraded mode, presses within this many cells of the last synthesized
   * click are treated as the same click (one terminal click can be reported
   * as several button presses at the same spot). Defaults to 1.
   */
  degradedDedupDistance?: number;

  /**
   * In degraded mode, how long (ms) a synthesized click's position is
   * deduplicated for. A press at the same spot after this window is a NEW
   * click, not a duplicate report. Defaults to 300. Set to 0 to dedupe only
   * same-millisecond bursts (practically disables position dedup).
   */
  degradedDedupWindowMs?: number;
};
