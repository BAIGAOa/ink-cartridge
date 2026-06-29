# useEventBus

Access the raw EventBus instance from context. For advanced use cases where `useEmitter`/`useSubscribe` aren't sufficient.

## Signature

```ts
function useEventBus<T extends EventMap>(): EventBus<T>
```

## Returns

The `EventBus<T>` instance. Throws if used outside `EventProvider`.

## Best Practice

Prefer `useEmitter` and `useSubscribe` — they handle cleanup and stability automatically. Use `useEventBus` only when you need direct access to `on`, `off`, `clear`, `subscriberCount`, or `clearEvent`.
