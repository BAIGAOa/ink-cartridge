# @cartridge-engine/event

A typed event bus for decoupled communication between components — a standalone package, imported on demand.

## Install

```bash
npm install @cartridge-engine/event
```

## `EventBus`

A typed event bus. Each handler for a given event is wrapped in try/catch so one failing handler does not prevent the remaining handlers from running.

```ts
const bus = createEventBus<{ tick: { n: number } }>();
const unsubscribe = bus.on('tick', (payload) => console.log(payload.n));
bus.emit('tick', { n: 1 });
unsubscribe();
```

Methods: `on`, `emit`, `off`, `clear`, `clearEvent`, `subscriberCount`.

## `EventProvider`

Provide an `EventBus` instance to the React component tree via context. The bus is cleared on unmount.

```tsx
<EventProvider bus={bus}>
  <App />
</EventProvider>
```

## Hooks

- `useEventBus()` — the raw `EventBus` instance from context (throws outside an `EventProvider`).
- `useEmitter(event)` — a stable emit function for a given event.
- `useSubscribe(event, callback, deps?)` — subscribe a callback; automatically unsubscribes on unmount.

## Types

- `EventMap`
- `EventKey`
- `Listener`
- `Unsubscribe`
- `EventProviderProps`
