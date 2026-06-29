import React, { useEffect } from "react";
import { EventBus } from "./EventBus.js";
import { BusContext } from "./context.js";
import { EventMap } from "./types.js";
import type { EventProviderProps } from "./types.js";

/**
 * Create a new typed EventBus instance.
 *
 * A convenience factory so users never need to write `new EventBus()`.
 *
 * @template T - Event map type mapping event names to payload types.
 * @returns A fresh EventBus instance.
 * @example
 * ```ts
 * interface MyEvents { save: void; quit: void }
 * const bus = createEventBus<MyEvents>();
 * ```
 */
export function createEventBus<T extends EventMap>(): EventBus<T> {
  return new EventBus<T>();
}

/**
 * Provide an EventBus instance to the React component tree via context.
 *
 * Clears all listeners on unmount to prevent leaks in HMR / test scenarios.
 * The caller owns the bus lifecycle — create it outside the component tree
 * or with `useRef`, then pass it as the `bus` prop.
 *
 * @param props.bus      - The EventBus instance to provide.
 * @param props.children - React children.
 * @example
 * ```tsx
 * const bus = createEventBus<MyEvents>();
 * render(
 *   <EventProvider bus={bus}>
 *     <App />
 *   </EventProvider>
 * );
 * ```
 */
export function EventProvider({ bus, children }: EventProviderProps) {
  useEffect(() => {
    return () => {
      bus.clear();
    };
  }, [bus]);

  return <BusContext.Provider value={bus}>{children}</BusContext.Provider>;
}
