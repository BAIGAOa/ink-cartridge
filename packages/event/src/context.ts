import { createContext } from "react";
import type { EventBus } from "./EventBus.js";

/**
 * React context carrying the EventBus instance provided by
 * {@link EventProvider}.
 */
export const BusContext = createContext<EventBus<any> | null>(null)

