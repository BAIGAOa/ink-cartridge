import type { EventEmitter } from 'node:events';
import type { MouseEvent, MouseEventAction } from '../types/index.js';
import { MouseError } from '../types/index.js';

/**
 * MouseConvenienceMethods provides promise-based wrappers for common mouse event patterns.
 *
 * Responsibilities:
 * - waitForClick: Wait for a single click event
 * - waitForInput: Wait for any mouse event
 * - getMousePosition: Get current mouse position (with caching)
 */
export class MouseConvenienceMethods {
  constructor(
    private emitter: EventEmitter,
    private getLastPosition: () => { x: number; y: number } | null,
  ) {}

  /**
   * Waits for a single click event and returns it.
   *
   * @param options Configuration options for the wait operation
   * @returns A promise that resolves with the click event
   * @throws {MouseError} If timeout is exceeded or operation is aborted
   */
  public async waitForClick({
    timeout = 30000,
    signal,
  }: {
    timeout?: number;
    signal?: AbortSignal;
  } = {}): Promise<MouseEvent> {
    if (signal?.aborted) {
      throw new MouseError('The operation was aborted.');
    }

    return new Promise<MouseEvent>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new MouseError(`Timeout waiting for click after ${timeout}ms`));
      }, timeout);

      const abortHandler = (): void => {
        cleanup();
        reject(new MouseError('The operation was aborted.'));
      };

      const clickHandler = (event: MouseEvent): void => {
        cleanup();
        resolve(event);
      };

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortHandler);
        this.emitter.off('click', clickHandler);
      };

      signal?.addEventListener('abort', abortHandler);
      this.emitter.on('click', clickHandler);
    });
  }

  /**
   * Waits for any mouse input event and returns it.
   *
   * @param options Configuration options for the wait operation
   * @returns A promise that resolves with the first mouse event received
   * @throws {MouseError} If timeout is exceeded or operation is aborted
   */
  public async waitForInput({
    timeout = 30000,
    signal,
  }: {
    timeout?: number;
    signal?: AbortSignal;
  } = {}): Promise<MouseEvent> {
    if (signal?.aborted) {
      throw new MouseError('The operation was aborted.');
    }

    return new Promise<MouseEvent>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new MouseError(`Timeout waiting for input after ${timeout}ms`));
      }, timeout);

      const abortHandler = (): void => {
        cleanup();
        reject(new MouseError('The operation was aborted.'));
      };

      const allEvents: MouseEventAction[] = ['press', 'release', 'drag', 'wheel', 'move', 'click'];

      // Store handler references to ensure we remove the same functions we added
      const handlers = new Map<MouseEventAction, (event: MouseEvent) => void>();

      const inputHandler =
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_action: MouseEventAction) =>
        (event: MouseEvent): void => {
          cleanup();
          resolve(event);
        };

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortHandler);
        handlers.forEach((handler, action) => {
          this.emitter.off(action, handler);
        });
      };

      signal?.addEventListener('abort', abortHandler);
      allEvents.forEach((action) => {
        const handler = inputHandler(action);
        handlers.set(action, handler);
        this.emitter.on(action, handler);
      });
    });
  }

  /**
   * Gets the current mouse position, returning immediately if available.
   *
   * If the mouse has moved since tracking was enabled, the position is returned
   * immediately without waiting. Otherwise, it waits for the next move event.
   *
   * @param options Configuration options for the wait operation
   * @returns A promise that resolves with the x, y coordinates
   * @throws {MouseError} If timeout is exceeded or operation is aborted
   */
  public async getMousePosition({
    timeout = 30000,
    signal,
  }: {
    timeout?: number;
    signal?: AbortSignal;
  } = {}): Promise<{ x: number; y: number }> {
    if (signal?.aborted) {
      throw new MouseError('The operation was aborted.');
    }

    // If we already have a cached position, return it immediately
    const cachedPosition = this.getLastPosition();
    if (cachedPosition !== null) {
      return cachedPosition;
    }

    return new Promise<{ x: number; y: number }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new MouseError(`Timeout waiting for mouse position after ${timeout}ms`));
      }, timeout);

      const abortHandler = (): void => {
        cleanup();
        reject(new MouseError('The operation was aborted.'));
      };

      const moveHandler = (event: MouseEvent): void => {
        cleanup();
        resolve({ x: event.x, y: event.y });
      };

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortHandler);
        this.emitter.off('move', moveHandler);
      };

      signal?.addEventListener('abort', abortHandler);
      this.emitter.on('move', moveHandler);
    });
  }
}
