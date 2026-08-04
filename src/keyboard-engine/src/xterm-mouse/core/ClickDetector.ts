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
  /** Consecutive presses with no release in between. */
  private consecutivePresses = 0;
  /** Timestamp of the last press — presses farther apart than the window restart the count. */
  private lastPressTime = 0;
  /** True once a press storm (no releases) has been detected. */
  private degraded = false;
  /** Last position a degraded-mode click was synthesized for (dedup). */
  private lastClickPosition: { x: number; y: number } | null = null;
  /** Timestamp of the last degraded-mode click (dedup window). */
  private lastClickTime = 0;
  private readonly clickDistanceThreshold: number;
  private readonly pressStormThreshold: number;
  private readonly pressStormWindowMs: number;
  private readonly degradedDedupDistance: number;
  private readonly degradedDedupWindowMs: number;

  constructor(options?: MouseOptions) {
    this.clickDistanceThreshold = options?.clickDistanceThreshold ?? 1;
    this.pressStormThreshold = options?.pressStormThreshold ?? 3;
    this.pressStormWindowMs = options?.pressStormWindowMs ?? 500;
    this.degradedDedupDistance = options?.degradedDedupDistance ?? 1;
    this.degradedDedupWindowMs = options?.degradedDedupWindowMs ?? 300;
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
      const now = Date.now();
      // Only presses arriving close together count as one storm — a slow
      // multi-button press on a well-behaved terminal must not spuriously
      // trigger degraded mode.
      if (this.lastPressTime === 0 || now - this.lastPressTime > this.pressStormWindowMs) {
        this.consecutivePresses = 0;
      }
      this.consecutivePresses++;
      this.lastPressTime = now;
      if (this.consecutivePresses >= this.pressStormThreshold) {
        this.degraded = true;
      }

      if (this.degraded) {
        // Press-only terminal: the press itself is the click. A single
        // terminal click can be reported as several button presses at the
        // same spot — synthesize only once per position, within a short
        // time window (a fresh click at the same spot later is a new click).
        const now = Date.now();
        const withinWindow = now - this.lastClickTime <= this.degradedDedupWindowMs;
        const nearLast =
          this.lastClickPosition !== null &&
          Math.max(
            Math.abs(event.x - this.lastClickPosition.x),
            Math.abs(event.y - this.lastClickPosition.y),
          ) <= this.degradedDedupDistance;
        if (!(nearLast && withinWindow)) {
          const clickEvent: MouseEvent = { ...event, action: 'click' };
          // Use nextTick to avoid emitting during event processing
          process.nextTick(() => {
            emitClick(clickEvent);
          });
          this.lastClickPosition = { x: event.x, y: event.y };
          this.lastClickTime = now;
        }
      }

      this.lastPress = event;
    } else if (event.action === 'release') {
      if (this.lastPress && !this.degraded) {
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
      this.consecutivePresses = 0;
      this.lastPressTime = 0;
      this.degraded = false;
      this.lastClickPosition = null;
      this.lastClickTime = 0;
    }
  }

  /**
   * Resets the click detector state.
   * Clears any pending press event and exits degraded mode.
   */
  public reset(): void {
    this.lastPress = null;
    this.consecutivePresses = 0;
    this.lastPressTime = 0;
    this.degraded = false;
    this.lastClickPosition = null;
    this.lastClickTime = 0;
  }
}
