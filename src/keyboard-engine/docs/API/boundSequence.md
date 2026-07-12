# boundSequence

Register a multi-key sequence binding on the current owner's layer.

When the first key of a registered sequence is pressed, the layer enters a pending state. Subsequent key presses are matched against the remaining sequence keys. If all keys match within the timeout, the handler fires. A mismatched key either cancels the sequence (default) or is silently consumed (`exclusive: true`).

Supports two calling conventions:
1. `boundSequence(keys, handler, options?)` — explicit keys and callback
2. `boundSequence(actionId, options?)` — uses a registered sequence action's preset keys

## Signature

```ts
boundSequence(keys: string | string[], handler: KeyHandler, options?: SequenceOptions): () => void
boundSequence(actionId: string, options?: SequenceOptions): () => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string \| string[]` | Ordered key names (≥ 2). |
| `handler` | `KeyHandler` | Callback invoked when the full sequence matches. |
| `actionId` | `string` | Reference a registered sequence action by its `sequenceActionId`. |
| `options` | `SequenceOptions` | Extends [`BoundKeyboardOptions`](./boundKeyboard.md) with sequence-specific settings. |

### SequenceOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `500` | Max ms between key presses. Timer starts on first key, resets on each match. |
| `exclusive` | `boolean` | `false` | When `true`, mismatched keys are silently consumed (keep waiting). When `false`, mismatch cancels the sequence. |

Plus all options from [`BoundKeyboardOptions`](./boundKeyboard.md): `focusId`, `onlyThis`, `once`, `times`, `observer`, `when`, `mode`.

## Returns

An unbind function. Removes the `SequenceBinding` from the layer's `sequences` map. If a sequence is currently pending, calling unbind does not cancel it — use [`abortComposition`](./composition/abortComposition.md) if you need to cancel a running sequence.

## Effect

Adds a `SequenceBinding` to `ScreenKeyboardLayer.sequences`, keyed by the first key in the sequence. When that key is pressed and no other sequence is already pending on this layer, a `PendingSequence` is created:

- A timer is started with `timeout` ms
- `nextIndex` is set to 1 (waiting for the second key)
- The `when` condition is checked at each key press — if it returns `false`, the pending sequence is cancelled

## Usage

```ts
// Explicit keys with handler
engine.boundSequence(['g', 'g'], () => {
  scrollToTop();
});

// With timeout and exclusive mode
engine.boundSequence(['ctrl+w', 'q'], handleQuit, {
  timeout: 1000,
  exclusive: true,
  mode: 'normal',
});

// Via sequence action
engine.defineSequenceAction([{
  sequenceActionId: 'vim-goto-top',
  action: () => scrollToTop(),
  keys: ['g', 'g'],
  timeout: 600,
}]);
engine.boundSequence('vim-goto-top');
```

## Throws

- `[ink-cartridge]` if fewer than 2 keys are provided
- `[ink-cartridge]` if the first key conflicts with a global sequence that has `cover: false`
- `[ink-cartridge]` if `observer` is set without `times`

## API interactions

- **[`defineSequenceAction`](./sequence-actions.md)** — sequence actions referenced by `actionId` must be registered before use
- **[`globalSequence`](./globalSequence.md)** — global sequences fire at a higher pipeline stage; `cover: false` prevents local override
- **[`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md)** — check if a global sequence is pending (separate from local sequences)
- **[`currentScreenHasSequenceWaiting`](./currentScreenHasSequenceWaiting.md)** — check if the current layer has a pending sequence
- **[`enableWildcardPriority`](./enableWildcardPriority.md)** — wildcard-priority mode affects all bindings including sequences
- **[`cleanLayers`](./cleanLayers.md)** — pending sequence timers on removed layers are cleared by cleanup
- **[`stop`](./stop.md)** — stopped keys don't propagate, which may prevent sequence first-key detection in lower layers
