import { EventKey, EventMap, Listener, Unsubscribe } from "./types.js";

/**
 * A typed event bus for decoupled communication between components.
 *
 * Each handler in a given event is wrapped in try/catch so that one
 * failing handler does not prevent the remaining handlers from running.
 *
 * @template T - Event map type mapping event names to their payload types.
 * @example
 * ```ts
 * interface MyEvents {
 *   save: { id: number };
 *   quit: void;
 * }
 * const bus = new EventBus<MyEvents>();
 * bus.on('save', ({ id }) => console.log(id));
 * bus.emit('save', { id: 1 });
 * ```
 */
export class EventBus<T extends EventMap> {
  private listeners = new Map<EventKey<T>, Set<Listener<any>>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   * @param event    - The event name to subscribe to.
   * @param listener - The callback to invoke when the event is emitted.
   * @returns A function that unsubscribes this listener when called.
   */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Emit an event with a payload.
   *
   * Each registered listener is called inside its own try/catch so that
   * an error in one handler does not prevent other handlers from running.
   * Errors are logged to `console.error` with an `[ink-cartridge]` prefix.
   *
   * @param event   - The event name to emit.
   * @param payload - The payload to pass to each listener.
   */
  emit<K extends EventKey<T>>(event: K, payload: T[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(
          `[ink-cartridge] Error in event handler for "${event}":`,
          error,
        );
      }
    });
  }

  /**
   * Unsubscribe from an event.
   *
   * If no listener is provided, all listeners for the event are removed.
   *
   * @param event    - The event name.
   * @param listener - Optional specific listener to remove.
   */
  off<K extends EventKey<T>>(event: K, listener?: Listener<T[K]>): void {
    if (!listener) {
      this.listeners.delete(event);
      return;
    }

    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for every event.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Remove all listeners for a single event type.
   *
   * @param event - The event name to clear.
   */
  clearEvent<K extends EventKey<T>>(event: K): void {
    this.listeners.delete(event);
  }

  /**
   * Get the number of subscribers for an event. Useful for debugging and testing.
   *
   * @param event - The event name.
   * @returns The number of registered listeners.
   */
  subscriberCount<K extends EventKey<T>>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
