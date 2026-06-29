# Advanced Patterns

## Module-Level Navigation

All navigation functions work outside React components — without `useScreenSystem`. They dispatch through a shared `_dispatchers` Set:

```ts
import { skip, back, gotoScreen, openOverlay, openModal } from 'ink-cartridge';

// Called from anywhere (event handlers, callbacks, tests)
skip(Settings, {});
back(2);
gotoScreen(Menu, {});
```

The functions throw if no `ScenarioManagementProvider` is mounted.

## Overlay as Notification

Use an overlay with `activate: false` for a passive notification that doesn't steal keyboard focus:

```tsx
openOverlay('notification', NotificationBar, { text: 'Saved!' }, { activate: false });
// Dismissed by the notification component itself or via closeOverlay('notification')
```

## Modal with renderNow

Use `renderNow: true` to keep a non-active modal visible (e.g. a background modal stack):

```tsx
openModal('settings', SettingsModal, {}, { zIndex: 1 });
openModal('confirm', ConfirmModal, {}, { zIndex: 2, renderNow: false });
// Only ConfirmModal receives keyboard. When closed, SettingsModal activates.
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
