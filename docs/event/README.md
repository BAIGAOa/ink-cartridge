# Event System

## Why

The keyboard system's `globalKeys` requires business logic to live inside the `operate` callback at registration time. When a keypress needs to trigger state changes in a different component, the only options are prop drilling or refs. The event bus solves this: `operate` emits an event, and any component subscribes — zero coupling between the key binding and the business logic.

## Architecture

```
createEventBus<T>()        ── creates a typed bus instance
        │
EventProvider bus={bus}    ── provides it via React context
        │
   ┌────┴────┐
   │         │
useEmitter  useSubscribe  ── emit and subscribe from any component
```

The emitter doesn't know who's listening. The subscriber doesn't know who's emitting. Both only agree on the event name and payload type.

## API Index

| API | Purpose |
|-----|---------|
| [createEventBus](./createEventBus-API.md) | Create a typed bus instance |
| [EventProvider](./EventProvider-API.md) | Provide the bus via context |
| [useEventBus](./useEventBus-API.md) | Access the raw bus |
| [useEmitter](./useEmitter-API.md) | Create a stable emit function pre-bound to one event |
| [useSubscribe](./useSubscribe-API.md) | Subscribe to an event with auto-cleanup |
| [EventBus](./EventBus-API.md) | Low-level class API (on, off, emit, clear) |

### Importable Types

```ts
import type { EventMap, EventKey, Listener, Unsubscribe, EventProviderProps } from 'ink-cartridge';
```

## Advanced

See [advanced.md](./advanced.md)
