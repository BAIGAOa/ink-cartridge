## 5.0.1 — Smart Persistent Layer and Modal Layer

### Concepts

#### Cross-page

A layer or modal layer that, once enabled, does not disappear when the page switches — it remains floating on top of the screen.

#### Host page

The `page` on which a persistent layer or persistent modal layer is opened. That `page` is the host page of the layer or modal layer.

### How to enable

This feature can be enabled through any of the following methods. "hook" denotes module-level methods; "context" denotes methods dispatched through `useScreenSystem`.

| type    | method         |
| ------- | -------------- |
| hook    | openLayer      |
| hook    | openModalLayer |
| context | openLayer      |
| context | openModalLayer |

All four methods enable the feature through the function parameter `options`. For example:

```typescript
openLayer("layer-1", 1, { crossPage: true, automaticTakeoverKeyboard: true });
```

The `crossPage` option enables the visual **cross-page** effect. It takes effect only when explicitly declared as `true`. When `skip`, `gotoScreen`, or `back` is invoked, all `layer`s without the `crossPage` option enabled are cleaned up automatically. All active bindings inside a `crossPage`-enabled `layer` remain responsive after page navigation.

The `automaticTakeoverKeyboard` option enables the smart keyboard takeover system. It takes effect only when explicitly declared as `true`. Once enabled, when this `layer` leaves its **host page** due to `skip`, `gotoScreen`, or similar methods, its keyboard is automatically deactivated; conversely, when it returns to the host page, its keyboard responses are reactivated. This automatically avoids potential conflicts without the need to write convoluted conditional checks.

### Internal implementation

**Host page capture**: `openLayer` / `openModalLayer` snapshot `state.path[last]` as `hostPage` and store it on the layer object. This is the reference used by all takeover comparisons — it does not change when the user navigates away.

```typescript
// provider.tsx — openLayer reducer
const newLayer: Layer = {
  layerId: action.layerId,
  // ...
  hostPage: state.path[state.path.length - 1] ?? null,
};
```

**Cross-page persistence**: the screen reducer filters `allLayers` and `allModalLayers` on `skip`/`back`/`gotoScreen`, keeping only layers with `crossPage === true` and removing the rest.

```typescript
// provider.tsx — skip reducer
const crossPageLayers = state.allLayers.filter(
  (each) => each.crossPage === true,
);
return { ...state, allLayers: crossPageLayers, /* ... */ };
```

**Owner stack**: `KeyboardEngine` maintains an internal `ownerStack`. Binding methods (`boundKeyboard`, `boundSequence`) call `getCurrentOwner()` — stack top wins, then fall back to top modalLayer → top layer → top page. `_pushOwner` / `_popOwner` are exposed to the React layer for manipulating the stack.

```typescript
// LayerManager.ts — pushOwner / popOwner / getCurrentOwner
pushOwner(owner) {
  this.state.ownerStackRef = [...this.state.ownerStackRef, owner];
}
popOwner(owner) {
  const idx = this.state.ownerStackRef.lastIndexOf(owner);
  if (idx !== -1) {
    this.state.ownerStackRef = [
      ...this.state.ownerStackRef.slice(0, idx),
      ...this.state.ownerStackRef.slice(idx + 1),
    ];
  }
}
getCurrentOwner() {
  const stack = this.state.ownerStackRef;
  if (stack.length > 0) return stack[stack.length - 1];
  // fallback: top modalLayer → top layer → top page
  // ...
}
```

**Keyboard deactivation (activeElements)**: the mechanism lives in `toKeyboardLayerState` inside `KeyboardProvider`. When a layer has `automaticTakeoverKeyboard` enabled and `currentPath[last] !== layer.hostPage`, all elements are excluded from `activeElements`. The key dispatch pipeline only checks `activeElements`, so the layer's bindings become dormant without being unregistered. Returning to the host page restores them. The standard `useKeyboard` owner-stack push/pop (mount/unmount) is unaffected — key dispatch is controlled purely at the sync level.

```typescript
// KeyboardProvider.tsx — toKeyboardLayerState
const awayFromHost =
  auto && hostPage && currentPath && currentPath.length > 0 &&
  currentPath[currentPath.length - 1] !== hostPage;

activeElements: awayFromHost
  ? []
  : Array.from(layer.elements.entries())
      .filter(([, el]) => el.active !== false)
      .map(([id]) => id),
```

**Sync**: `KeyboardProvider` calls `engine.sync()` synchronously during render to push the current screen state (including the filtered `activeElements`) into `KeyboardEngine`; cleanup methods (`cleanLayers`, etc.) run in `useEffect` so they can compare pre- and post-sync state.

```typescript
// KeyboardProvider.tsx — render
engine.sync({
  pagePath: currentPath,
  layers: toKeyboardLayerState(allLayers, currentPath),
  modalLayers: toKeyboardLayerState(allModalLayers, currentPath),
});

useEffect(() => { engine.cleanLayers(); }, [currentPath, engine]);
useEffect(() => { engine.cleanOverlayLayers(); }, [allLayers, engine]);
useEffect(() => { engine.cleanModalLayers(); }, [allModalLayers, engine]);
```
