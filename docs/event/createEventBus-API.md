# createEventBus

Factory for creating a typed EventBus instance. A convenience wrapper around `new EventBus<T>()`.

## Signature

```ts
function createEventBus<T extends EventMap>(): EventBus<T>
```

## Returns

A new `EventBus` instance typed to the given event map.

## Best Practice

Create the bus outside the component tree, before `render`:

```ts
interface AppEvents {
  SAVE: void;
  QUIT: void;
}

const bus = createEventBus<AppEvents>();

render(
  <EventProvider bus={bus}>
    <App />
  </EventProvider>
);
```

The bus instance is stable for the app's entire lifetime. The same instance is used by `useEmitter` and `useSubscribe` through context.
