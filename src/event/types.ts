import { ReactNode } from "react";
import type { EventBus } from "./EventBus.js";

export type EventMap = Record<string, any>;

export type EventKey<T extends EventMap> = string & keyof T;

export type Listener<T> = (payload: T) => void;

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
