# EventBus (Class)

The low-level typed event bus. Usually accessed via `useEmitter`/`useSubscribe` hooks rather than directly.

## API

### on

```ts
on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe
```

Subscribe. Returns a function that unsubscribes when called.

### off

```ts
off<K extends EventKey<T>>(event: K, listener?: Listener<T[K]>): void
```

Unsubscribe. Omit `listener` to remove all subscribers for the event.

### emit

```ts
emit<K extends EventKey<T>>(event: K, payload: T[K]): void
```

Emit an event. Each listener is called inside its own try/catch — one error won't block other listeners. Errors are logged to `console.error` with a `[ink-cartridge]` prefix.

### clear

```ts
clear(): void
```

Remove all listeners for all events.

### clearEvent

```ts
clearEvent<K extends EventKey<T>>(event: K): void
```

Remove all listeners for a single event.

### subscriberCount

```ts
subscriberCount<K extends EventKey<T>>(event: K): number
```

Number of listeners for an event. Useful for debugging and tests.
