# pushOwner / popOwner / readLayer

Manage the owner stack — the mechanism that determines which keyboard layer new bindings are stored on.

The "current owner" is the top of the owner stack. Every call to [`boundKeyboard`](./boundKeyboard.md), [`penetration`](./penetration.md), [`stop`](./stop.md), etc. registers on the layer belonging to the current owner. Overlay and modal rendering code pushes the overlay/modal ID onto the owner stack so that bindings inside that overlay attach to the overlay's layer, not the underlying screen's.

## Signatures

```ts
pushOwner(owner: unknown | string): void
popOwner(owner: unknown | string): void
readLayer(owner: unknown | string): ScreenKeyboardLayer | undefined
```

## Parameters

| Method | Param | Description |
|--------|-------|-------------|
| `pushOwner` | `owner` | The component or overlay/modal ID to push onto the stack. |
| `popOwner` | `owner` | The owner to remove. Uses `lastIndexOf` so nested owners of the same type unwind correctly. |
| `readLayer` | `owner` | The owner whose layer to read. |

## Returns

| Method | Returns | Description |
|--------|---------|-------------|
| `pushOwner` | `void` | |
| `popOwner` | `void` | |
| `readLayer` | `ScreenKeyboardLayer \| undefined` | The layer for the given owner, or `undefined` if none exists. |

## Effect

### pushOwner

Appends the owner to the end of the `ownerStackRef` array. The top of the stack (last element) determines where subsequent bindings are registered.

### popOwner

Finds the last occurrence of `owner` in the stack (using `Array.lastIndexOf`) and removes it. Uses `lastIndexOf` so that nested instances of the same component type (e.g. two overlays) unwind from innermost to outermost.

### readLayer

Returns the `ScreenKeyboardLayer` for the given owner without creating one. Returns `undefined` when no layer exists — unlike other binding functions that lazily create layers, `readLayer` is read-only.

## Usage

```ts
// When rendering an overlay:
engine.pushOwner(overlayId);
// ... bindings inside the overlay register on the overlay's layer
engine.popOwner(overlayId);

// Inspect a layer without creating it
const layer = engine.readLayer(screenComponent);
if (layer) {
  console.log('Focus targets:', layer.focusOrder.length);
}
```

## API interactions

- **[`boundKeyboard`](./boundKeyboard.md)** / **[`boundSequence`](./boundSequence.md)** / **[`penetration`](./penetration.md)** / **[`stop`](./stop.md)** / **[`allowModal`](./allowModal.md)** / **[`useModalMissListener`](./useModalMissListener.md)** — all register on the current owner's layer
- **[`focusSet`](./focus-system.md)** — focus targets live on the current owner's layer
