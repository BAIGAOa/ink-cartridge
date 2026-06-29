import { createContext } from "react";
import type { EventBus } from "./EventBus.js";

export const BusContext = createContext<EventBus<any> | null>(null)

