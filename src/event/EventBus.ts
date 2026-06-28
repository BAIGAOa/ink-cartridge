import { EventKey, EventMap, Listener, Unsubscribe } from "./types.js";


export default class EventBus<T extends EventMap> {
  private listeners = new Map<EventKey<T>, Set<Listener<any>>>()

  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => this.off(event, listener)
  }

  emit<K extends EventKey<T>>(event: K, payload: T[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(listener => {
        return listener(payload)
      })
    }
  }

  off<K extends EventKey<T>>(event: K, listener?: Listener<T[K]>): void {
    if (!listener) {
      this.listeners.delete(event)
      return
    }

    const set = this.listeners.get(event)
    if (set) {
      set.delete(listener)
      if (set.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  clear() {
    this.listeners.clear()
  }
}
