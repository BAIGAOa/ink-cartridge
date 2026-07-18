# cleanLayers / cleanOverlayLayers / cleanModalLayers

Remove keyboard layers for screens, overlays, and modals that have left the component tree.

These three methods are the "cleanup side" of the [`sync`](./sync.md) / `processKey` lifecycle. Where `sync` pushes new state into the engine, these methods remove old state. They are designed to be called in a **post-render effect** (e.g. `useEffect` in React) so they can compare the current state against what was pushed by the most recent `sync`.

## Signatures

```ts
cleanLayers(): void
cleanOverlayLayers(): void
cleanModalLayers(): void
```

## Parameters

None.

## Returns

Nothing (`void`).

## Effect

### cleanLayers

Iterates over all keyboard layers in `layersRef`. For each layer:
- Determines whether the layer's owner is still present in the current screen path
- If not: clears any pending sequence timer (prevents stale timeouts from firing after the layer is gone), then deletes the layer from the map

### cleanOverlayLayers

Same pattern as `cleanLayers`, but checks against `displayedOverlays`. Only cleans up layers belonging to overlay owners that are no longer displayed.

### cleanModalLayers

Same pattern, checks against `displayedModals`. Only cleans up layers belonging to modal owners that are no longer displayed.

## Usage

```ts
// Called in a post-render effect so the comparison sees the synced state
engine.sync({
  path: currentPath,
  activeOverlayIds,
  displayedOverlays,
  activeModalId,
  displayedModals,
});

// Post-render — remove layers for detached screens/overlays/modals
engine.cleanLayers();
engine.cleanOverlayLayers();
engine.cleanModalLayers();
```

In React (via `KeyboardProvider`):

```ts
// These three effects run after every render:
useEffect(() => { engine.cleanLayers(); }, [currentPath, engine]);
useEffect(() => { engine.cleanOverlayLayers(); }, [displayedOverlays, engine]);
useEffect(() => { engine.cleanModalLayers(); }, [displayedModals, engine]);
```

## API interactions

- **[`sync`](./sync.md)** — `sync` pushes new state; these methods clean up stale state from the previous render cycle
- **[`processKey`](./processKey.md)** — cleanup runs in a post-render effect after key processing; ensures stale sequence timers don't fire on removed layers
- **[`boundSequence`](./boundSequence.md)** — pending sequence timers on removed layers are cleared by `cleanLayers`, preventing leaks
