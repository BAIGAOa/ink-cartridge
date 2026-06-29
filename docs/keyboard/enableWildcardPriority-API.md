# enableWildcardPriority

Give `*` (wildcard) bindings absolute priority on the current layer. When active, the wildcard fires before any other binding — including sequences and exact key matches. Ref-counted: each caller must call its disable function; the mode turns off when the count reaches zero.

## Signature

```ts
function enableWildcardPriority(): () => void
```

## Returns

`() => void` — call to decrement the ref count. When the count reaches zero, wildcard priority is disabled.

## Best Practice

Used internally by `TextInput` to capture character input before other focus targets. User code rarely needs this directly — only when implementing a custom input component that needs to intercept printable characters before anything else on the layer.
