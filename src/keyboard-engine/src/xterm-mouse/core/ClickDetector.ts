import type { MouseEvent, MouseOptions } from '../types/index.js';

/**
 * ClickDetector manages click detection from mouse press and release events.
 *
 * A click is detected when:
 * - A press event occurs
 * - Followed by a release event within clickDistanceThreshold
 * - The threshold is the maximum allowed distance (in cells) between press and release
 *
 * Responsibilities:
 * - Track last press event
 * - Detect clicks based on press+release proximity
 * - Emit click events through provided callback
 */
export class ClickDetector {
  private lastPress: MouseEvent | null = null;
  private readonly clickDistanceThreshold: number;

  constructor(options?: MouseOptions) {
    this.clickDistanceThreshold = options?.clickDistanceThreshold ?? 1;
  }

  /**
   * Processes a mouse event and detects clicks.
   *
   * When a press event is received, it's stored.
   * When a release event is received, checks if it matches the last press
   * within the click distance threshold.
   *
   * @param event The mouse event to process
   * @param emitClick Callback to emit a click event when detected
   */
  public processEvent(event: MouseEvent, emitClick: (clickEvent: MouseEvent) => void): void {
    if (event.action === 'press') {
      this.lastPress = event;
    } else if (event.action === 'release') {
      if (this.lastPress) {
        const xDiff = Math.abs(event.x - this.lastPress.x);
        const yDiff = Math.abs(event.y - this.lastPress.y);

        if (xDiff <= this.clickDistanceThreshold && yDiff <= this.clickDistanceThreshold) {
          const clickEvent: MouseEvent = { ...event, action: 'click' };
          // Use nextTick to avoid emitting during event processing
          process.nextTick(() => {
            emitClick(clickEvent);
          });
        }
      }
      this.lastPress = null;
    }
  }

  /**
   * Resets the click detector state.
   * Clears any pending press event.
   */
  public reset(): void {
    this.lastPress = null;
  }
}
