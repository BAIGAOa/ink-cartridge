import type { MouseEvent } from '../types/index.js';

/**
 * PositionTracker tracks the last known mouse position.
 *
 * Responsibilities:
 * - Track mouse position from move and drag events
 * - Provide synchronous access to last position
 * - Support waiting for position updates
 */
export class PositionTracker {
  private lastPosition: { x: number; y: number } | null = null;

  /**
   * Processes a mouse event and updates position tracking.
   *
   * @param event The mouse event to process
   */
  public processEvent(event: MouseEvent): void {
    if (event.action === 'move' || event.action === 'drag') {
      this.lastPosition = { x: event.x, y: event.y };
    }
  }

  /**
   * Gets the last known mouse position synchronously.
   *
   * @returns The last known position as { x, y }, or null if no movement yet
   */
  public getLastPosition(): { x: number; y: number } | null {
    return this.lastPosition;
  }

  /**
   * Resets the position tracker state.
   */
  public reset(): void {
    this.lastPosition = null;
  }
}
