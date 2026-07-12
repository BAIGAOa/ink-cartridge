# globalSequence / getGlobalSequences / getGlobalPendingSequence

Register global multi-key sequences that fire regardless of the screen stack.

Global sequences fire at pipeline stages 2 and 6 — just above global keys. They have higher priority than single-key global bindings and should be used for application-wide key chords (like Vim-style `g g` to scroll to top).

## Signatures

```ts
globalSequence(entries: GlobalSequenceEntry[], options?: { mode?: "replace" | "add" }): void
getGlobalSequences(): ResolvedGlobalSequenceEntry[]
getGlobalPendingSequence(): GlobalPendingSequence | null
```

## Parameters

### globalSequence

| Param | Type | Description |
|-------|------|-------------|
| `entries` | `GlobalSequenceEntry[]` | Global sequence definitions. |
| `options.mode` | `"replace" \| "add"` | `"replace"` (default) replaces all global sequences; `"add"` appends. |

### GlobalSequenceEntry

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `keys` | `string[]` | **required** | Ordered key names (≥ 2). |
| `operate` | `(() => void) \| string` | **required** | Callback or registered sequence action ID. |
| `cover` | `boolean` | `true` | When `false`, screens cannot override via `boundSequence`. |
| `affectOverlay` | `boolean` | `false` | When `true`, fires before the overlay stage. |
| `category` | `unknown[] \| "*"` | `"*"` | Whitelist of screens. |
| `timeout` | `number` | `500` | Max ms between key presses. |
| `exclusive` | `boolean` | `false` | When `true`, mismatched keys are silently consumed. |
| `when` | `(() => boolean) \| string` | — | Condition gating. |
| `executeWhenNoOverlay` | `boolean` | `false` | Fire with `affectOverlay: true` even when no overlay is active. |
| `mode` | `string` | — | Restrict to a specific mode. |

## Returns

### globalSequence

Nothing (`void`).

### getGlobalSequences

A shallow copy of all resolved global sequence entries.

### getGlobalPendingSequence

The current `GlobalPendingSequence` if one is active (between first key and completion/timeout), or `null`.

## Effect

Writes entries into `globalSequencesRef`. String `operate` values are resolved to sequence action functions at registration time.

When the first key of any registered sequence is pressed, the global sequence processor creates a `GlobalPendingSequence` stored in `globalPendingSeqRef`. Subsequent key presses are matched against the pending sequence. On full match: handler fires, pending state clears. On timeout or exclusive mismatch: pending state clears (or waits in exclusive mode).

## Usage

```ts
engine.globalSequence([
  { keys: ['g', 'g'], operate: () => scrollToTop(), timeout: 600 },
  { keys: ['ctrl+w', 'q'], operate: 'quit-all', exclusive: true },
  { keys: ['ctrl+b', 'd'], operate: toggleDebug, mode: 'normal' },
]);

// Add without replacing
engine.globalSequence([
  { keys: ['ctrl+k', 'ctrl+k'], operate: openQuickMenu },
], { mode: 'add' });

// Check for pending state
const pending = engine.getGlobalPendingSequence();
if (pending) {
  // Show partial key hint: "g _"
}
```

## Throws

- `[ink-cartridge]` if any sequence has fewer than 2 keys

## API interactions

- **[`globalKeys`](./globalKeys.md)** — global sequences fire at higher priority (stages 2/6) than global keys (stages 3/7)
- **[`boundSequence`](./boundSequence.md)** — local sequences are lower priority; `cover: false` prevents local override
- **[`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md)** — reactive way to check if a global sequence is pending (with automatic re-render sync)
- **[`defineSequenceAction`](./sequence-actions.md)** — string `operate` values reference registered sequence actions
- **[`Mode System`](./mode-system.md)** — mode-gated sequences are skipped when the active mode doesn't match
