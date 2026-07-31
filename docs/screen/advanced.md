# Advanced Patterns

## Module-Level Navigation

Navigation and layer/modal-layer functions work outside React components — without `useScreenSystem`. They dispatch through a shared `_dispatchers` Set:

```ts
import {
  skip,
  back,
  gotoScreen,
  openLayer,
  applyElement,
  openModalLayer,
  applyElementToModalLayer,
} from 'ink-cartridge';

// Called from anywhere (event handlers, callbacks, tests)
skip(Settings, {});
back(2);
gotoScreen(Menu, {});
openLayer('notification', 10);
applyElement('notification', { elementId: 'notification-element', element: NotificationBar });
```

The functions throw if no `ScenarioManagementProvider` is mounted.

## Layer as Notification

Use `active: false` in a `LayerElement` for a passive notification that doesn't steal keyboard focus:

```tsx
openLayer('notification', 10);
applyElement('notification', {
  elementId: 'notification-element',
  element: NotificationBar,
  active: false,
});
// Dismissed by the notification component itself or via closeLayer('notification')
```

## Cross-Page Layers & Modal Layers

Use `crossPage: true` to keep a layer or modal layer across screen navigation — e.g. a global search panel, music player, or notification that should remain visible regardless of which screen is active.

```tsx
// Open a cross-page search layer
openLayer('global-search', 10, { crossPage: true });
applyElement('global-search', {
  elementId: 'search-element',
  element: SearchPanel,
});

// Navigate to search results — layer stays rendered, keyboard deactivated
skip(SearchResults, { query: 'hello' });

// Navigate back — layer's keyboard is automatically restored
back();
```

Cross-page modal layers work the same way:

```tsx
openModalLayer('player', 100, { crossPage: true });
applyElementToModalLayer('player', {
  elementId: 'player-element',
  element: MusicPlayer,
});
```

Explicit close functions (`closeLayer`, `closeModalLayer`, `closeAllLayer`, `closeAllModalLayer`) always clear `crossPage` entries — persistence only applies to navigation-triggered clearing.

## Multiple Modal Layers

All modal layers render, but only the highest-`zIndex` modal layer receives keyboard input:

```tsx
openModalLayer('settings', 1);
applyElementToModalLayer('settings', {
  elementId: 'settings-element',
  element: SettingsModal,
});
openModalLayer('confirm', 2);
applyElementToModalLayer('confirm', {
  elementId: 'confirm-element',
  element: ConfirmModal,
});
// Both modal layers render, but only ConfirmModal receives keyboard.
```

## onlyAttribute for Param Updates

When the same screen is already top-of-stack and you just want to update its props without remounting:

```tsx
skip(SameScreen, { filter: 'new' }, { onlyAttribute: true });
```

## Navigation + Event Bus

Wire screen transitions to events so any component can trigger navigation:

```tsx
function NavigationHandler() {
  const { skip, back, gotoScreen } = useScreenSystem();

  useSubscribe('NAV:GOTO', ({ screen, params }) => {
    gotoScreen(screen, params);
  });
  useSubscribe('NAV:BACK', () => back());

  return null;
}
```
