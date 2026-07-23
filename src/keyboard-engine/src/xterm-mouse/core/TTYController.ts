import { ANSI_CODES } from '../parser/constants.js';
import type { ReadableStreamWithEncoding } from '../types/index.js';
import { MouseError } from '../types/index.js';
import { validateFunction, validateReadableStream, validateWritableStream } from '../utils/validation.js';

/**
 * FinalizationRegistry for automatic cleanup of TTY controllers.
 *
 * When a TTYController is garbage collected without explicit cleanup,
 * this registry ensures that:
 * - The stdin 'data' event listener is removed
 * - The input stream state is restored (raw mode disabled, stream paused)
 * - ANSI disable codes are sent to the terminal
 *
 * This prevents memory leaks from accumulated event listeners when controllers
 * are not properly destroyed.
 */
const ttyCleanupRegistry: FinalizationRegistry<{
  inputStream: ReadableStreamWithEncoding;
  handleEvent: (data: Buffer) => void;
  outputStream: NodeJS.WriteStream;
  previousRawMode: boolean | null;
  isRaw: boolean | null;
  setRawModeFn?: (mode: boolean) => void;
}> = new FinalizationRegistry(
  (heldValue: {
    inputStream: ReadableStreamWithEncoding;
    handleEvent: (data: Buffer) => void;
    outputStream: NodeJS.WriteStream;
    previousRawMode: boolean | null;
    isRaw: boolean | null;
    setRawModeFn?: (mode: boolean) => void;
  }) => {
    try {
      heldValue.inputStream.off('data', heldValue.handleEvent);
    } catch {
      // Ignore errors during GC cleanup
    }

    try {
      if (heldValue.isRaw) {
        if (heldValue.setRawModeFn) {
          heldValue.setRawModeFn(false);
        } else {
          heldValue.inputStream.setRawMode(false);
        }
      }
      heldValue.inputStream.pause();
    } catch {
      // Ignore errors during GC cleanup
    }

    try {
      heldValue.outputStream.write(
        ANSI_CODES.mouseSGR.off + ANSI_CODES.mouseMotion.off + ANSI_CODES.mouseDrag.off + ANSI_CODES.mouseButton.off,
      );
    } catch {
      // Ignore errors during GC cleanup
    }
  },
);

/**
 * TTYController manages terminal state for mouse event tracking.
 *
 * Responsibilities:
 * - Enable/disable terminal mouse mode via ANSI escape codes
 * - Manage input stream state (raw mode, encoding, pause/resume)
 * - Provide pause/resume for event throttling without terminal overhead
 * - Automatic cleanup via FinalizationRegistry
 */
export class TTYController {
  private enabled = false;
  private paused = false;
  private previousEncoding: BufferEncoding | null = null;
  private previousRawMode: boolean | null = null;
  private currentRawMode: boolean | null = null;
  private cleanupToken: { instance: TTYController } | null = null;

  constructor(
    private inputStream: ReadableStreamWithEncoding,
    private outputStream: NodeJS.WriteStream,
    private handleEvent: (data: Buffer) => void,
    private setRawModeFn?: (mode: boolean) => void,
  ) {
    validateReadableStream(inputStream, 'inputStream');
    // biome-ignore lint/security/noSecrets: stream name
    validateWritableStream(outputStream, 'outputStream');
    validateFunction(handleEvent, 'handleEvent');

    if (setRawModeFn !== undefined) {
      // biome-ignore lint/security/noSecrets: function name
      validateFunction(setRawModeFn, 'setRawModeFn');
    }
  }

  /**
   * Sets raw mode on the input stream using either the custom function
   * or the default stream.setRawMode method.
   */
  private setRawMode(mode: boolean): void {
    if (this.setRawModeFn) {
      this.setRawModeFn(mode);
    } else {
      this.inputStream.setRawMode(mode);
    }
  }

  /**
   * Enables mouse event tracking.
   *
   * This method activates mouse event capture by putting the input stream into raw mode
   * and sending the appropriate ANSI escape sequences to enable mouse tracking in the terminal.
   *
   * @throws {Error} If the input stream is not a TTY
   * @throws {MouseError} If enabling mouse tracking fails
   */
  public enable = (): void => {
    if (this.enabled) {
      return;
    }

    if (!this.inputStream.isTTY) {
      throw new Error('Mouse events require a TTY input stream');
    }

    try {
      this.previousRawMode = this.setRawModeFn ? (this.currentRawMode ?? false) : (this.inputStream.isRaw ?? false);
      this.previousEncoding = this.inputStream.readableEncoding || null;

      this.enabled = true;

      this.outputStream.write(
        ANSI_CODES.mouseButton.on + ANSI_CODES.mouseDrag.on + ANSI_CODES.mouseMotion.on + ANSI_CODES.mouseSGR.on,
      );

      this.setRawMode(true);
      this.currentRawMode = true;
      this.inputStream.setEncoding('utf8');
      this.inputStream.resume();
      this.inputStream.on('data', this.handleEvent);

      this.cleanupToken = { instance: this };
      ttyCleanupRegistry.register(
        this,
        {
          inputStream: this.inputStream,
          handleEvent: this.handleEvent,
          outputStream: this.outputStream,
          previousRawMode: this.previousRawMode,
          isRaw: this.inputStream.isRaw ?? false,
          setRawModeFn: this.setRawModeFn,
        },
        this.cleanupToken,
      );
    } catch (err) {
      this.enabled = false;
      throw new MouseError(
        `Failed to enable mouse: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      );
    }
  };

  /**
   * Disables mouse event tracking.
   *
   * This method restores the input stream to its previous state and stops listening for data.
   */
  public disable = (): void => {
    if (!this.enabled) {
      return;
    }

    try {
      // Unregister from FinalizationRegistry before cleanup
      if (this.cleanupToken) {
        ttyCleanupRegistry.unregister(this.cleanupToken);
        this.cleanupToken = null;
      }

      this.inputStream.off('data', this.handleEvent);
      this.inputStream.pause();

      if (this.previousRawMode !== null) {
        this.setRawMode(this.previousRawMode);
        this.currentRawMode = this.previousRawMode;
      }

      if (this.previousEncoding !== null) {
        this.inputStream.setEncoding(this.previousEncoding);
      }

      this.outputStream.write(
        ANSI_CODES.mouseSGR.off + ANSI_CODES.mouseMotion.off + ANSI_CODES.mouseDrag.off + ANSI_CODES.mouseButton.off,
      );
    } catch (err) {
      throw new MouseError(
        `Failed to disable mouse: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      );
    } finally {
      this.enabled = false;
      this.previousRawMode = null;
      this.previousEncoding = null;
      this.currentRawMode = null;
    }
  };

  /**
   * Pauses mouse event emission without disabling terminal mouse mode.
   *
   * This method temporarily stops the emission of mouse events while keeping
   * the terminal mouse mode active.
   *
   * **Idempotent:** Calling this method when already paused has no effect.
   *
   * **No Terminal State Changes:** Unlike disable(), this method does not:
   * - Send ANSI escape codes to the terminal
   * - Modify the input stream's raw mode
   * - Change the input stream encoding
   * - Remove event listeners from the input stream
   */
  public pause = (): void => {
    if (this.paused) {
      return;
    }

    this.paused = true;
  };

  /**
   * Resumes mouse event emission without modifying terminal mouse mode.
   *
   * This method resumes the emission of mouse events after they were paused.
   *
   * **Idempotent:** Calling this method when not paused has no effect.
   */
  public resume = (): void => {
    if (!this.paused) {
      return;
    }

    this.paused = false;
  };

  /**
   * Checks if mouse event tracking is currently enabled.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Checks if mouse event emission is currently paused.
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Destroys the controller and cleans up all resources.
   *
   * **Idempotent:** Calling this method multiple times is safe and has no additional effect.
   */
  public destroy(): void {
    this.disable();

    if (this.cleanupToken) {
      ttyCleanupRegistry.unregister(this.cleanupToken);
      this.cleanupToken = null;
    }
  }
}
