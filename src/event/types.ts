import { ReactNode } from "react";
import type { EventBus } from "./EventBus.js";

/**
 * A record mapping event names to their payload types.
 */
export type EventMap = Record<string, any>;

/**
 * A valid event name for the given event map.
 */
export type EventKey<T extends EventMap> = string & keyof T;

/**
 * A callback invoked with an event's payload.
 */
export type Listener<T> = (payload: T) => void;

/**
 * A function that removes a previously registered listener.
 */
export type Unsubscribe = () => void;

/**
 * Props for the {@link EventProvider} component.
 */
export interface EventProviderProps {
  /** The EventBus instance to provide to the component tree. */
  bus: EventBus<any>;
  /** React children. */
  children: ReactNode;
}
