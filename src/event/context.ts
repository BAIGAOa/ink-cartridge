import { createContext } from "react";
import EventBus from "./EventBus.js";

export const BusContext = createContext<EventBus<any> | null>(null)

