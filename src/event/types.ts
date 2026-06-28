export type EventMap = Record<string, any>

export type EventKey<T extends EventMap> = string & keyof T

export type Listener<T> = (playload: T) => void


export type Unsubscribe = () => void;
