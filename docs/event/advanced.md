# Advanced Patterns

## GlobalKeys + Event Bus

The recommended pattern for cross-component communication via global keys:

```tsx
interface AppEvents {
  SAVE: void;
  QUIT: void;
  SHOW_NOTIFICATION: { text: string };
}

const bus = createEventBus<AppEvents>();

function GlobalKeys() {
  const emitSave = useEmitter('SAVE');
  const emitQuit = useEmitter('QUIT');
  const { globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      { key: ['ctrl+s'], operate: emitSave, category: '*' },
      { key: ['ctrl+q'], operate: emitQuit, category: '*', times: 2 },
    ]);
  }, []);

  return null;
}

function NotificationBar() {
  const [msg, setMsg] = useState<string | null>(null);
  useSubscribe('SHOW_NOTIFICATION', ({ text }) => setMsg(text));
  if (!msg) return null;
  return <Text color="green">{msg}</Text>;
}
```

Key insight: `GlobalKeys` renders `null` and never unmounts. It keeps the global key registrations alive forever without lifecycle issues. All business logic lives in the subscribing components.

## Direct Bus Access for Debugging

Use `useEventBus` + `subscriberCount` to inspect the bus during development:

```tsx
function EventDebugger() {
  const bus = useEventBus();
  return <Text>SAVE listeners: {bus.subscriberCount('SAVE')}</Text>;
}
```

## Navigation via Events

Combine with the screen system's module-level navigation:

```tsx
function NavigationHandler() {
  const { skip, back, gotoScreen } = useScreenSystem();

  useSubscribe('NAV:GOTO', ({ screen, params }) => gotoScreen(screen, params));
  useSubscribe('NAV:BACK', () => back());

  return null;
}
```

Then any component (including `GlobalKeys`) can trigger navigation by emitting `NAV:GOTO` or `NAV:BACK`.
