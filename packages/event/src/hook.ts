import { useContext, useEffect, useCallback } from "react";
import { EventBus } from "./EventBus.js";
import { BusContext } from "./context.js";
import type { EventMap } from "./types.js";

/**
 * Access the raw EventBus instance from context.
 *
 * Throws if used outside an {@link EventProvider}.
 *
 * @template T - Event map type (defaults to `Record<string, any>`).
 * @returns The EventBus instance.
 * @throws {Error} If no EventProvider is found in the component tree.
 */
export function useEventBus<T extends EventMap = Record<string, any>>(): EventBus<T> {
  const ctx = useContext(BusContext);
  if (!ctx) {
    throw new Error(
      "[ink-cartridge] useEventBus must be used within an EventProvider",
    );
  }
  // This cast is safe: the consumer specifies the event map type, and the
  // underlying bus instance is structurally compatible with any EventMap.
  return ctx as EventBus<T>;
}

/**
 * Create a stable emitter function pre-bound to a specific event.
 *
 * The returned function is stable across re-renders (via `useCallback`)
 * because the bus instance and event name are constant for the provider's
 * lifetime.
 *
 * @param event - The event name to emit.
 * @returns A function that accepts a payload and emits the event.
 * @example
 * ```tsx
 * const emitSave = useEmitter('save');
 * emitSave({ id: 1 });
 * ```
 */
export function useEmitter<K extends string>(event: K): (payload: any) => void {
  const bus = useEventBus();
  return useCallback(
    (payload: any) => {
      bus.emit(event, payload);
    },
    [bus, event],
  );
}

/**
 * Subscribe to an event and automatically unsubscribe on unmount.
 *
 * The subscription is re-bound whenever an entry in `deps` changes,
 * allowing the callback to close over fresh state without a callback-ref
 * wrapper. Pass the same values you would put in a `useEffect` dependency
 * array.
 *
 * @param event    - The event name to subscribe to.
 * @param callback - The callback to invoke when the event is emitted.
 * @param deps     - Optional dependency array (default `[]`). When any dep
 *                   changes, the subscription is re-bound with the latest
 *                   callback.
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * useSubscribe('increment', () => setCount(c => c + 1), []);
 * ```
 */
export function useSubscribe(
  event: string,
  callback: (payload: any) => void,
  deps: any[] = [],
): void {
  const bus = useEventBus();

  useEffect(() => {
    const unsubscribe = bus.on(event, callback);
    return unsubscribe;
    // We intentionally spread deps so callers control when the subscription
    // re-binds. bus and event are stable for the provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, event, ...deps]);
}
