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
};
