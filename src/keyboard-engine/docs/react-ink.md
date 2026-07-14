# React / Ink (ink-cartridge)

The engine is the keyboard backbone of [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge). If you are using React + Ink, use `ink-cartridge` directly — it wraps the engine with a React context provider, hooks, and an Ink-specific `normalizeKeyNames` adapter out of the box.

## Setup

```bash
npm install ink-cartridge
```

```tsx
import { KeyboardProvider } from 'ink-cartridge';

function App() {
  return (
    <KeyboardProvider modes={['normal', 'insert']}>
      <MyScreen />
    </KeyboardProvider>
  );
}
```

## Basic Usage

```tsx
import { useKeyboard } from 'ink-cartridge';

function MyScreen() {
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['ctrl+s'], () => save());
  }, []);

  return <Text>Press Ctrl+S to save</Text>;
}
```

## Focus Management

```tsx
function LoginForm() {
  const { focusSet, boundKeyboard } = useKeyboard();

  useEffect(() => {
    // Auto-focus the username field on mount
    focusSet('username');
  }, []);

  return (
    <Box flexDirection="column">
      <TextInput value={username} onChange={setUsername} focusId="username" />
      <TextInput value={password} onChange={setPassword} focusId="password" mask="*" />
    </Box>
  );
}
```

## Modal with allowModal

```tsx
function HelpModal() {
  const { boundKeyboard, allowModal } = useKeyboard();

  useEffect(() => {
    // Let Escape pass through to a global handler that closes the modal
    return allowModal(['escape']);
  }, []);

  useEffect(() => {
    return boundKeyboard(['q'], () => closeModal());
  }, []);

  return <Text>Press Escape or Q to close</Text>;
}
```

## Overlays

```tsx
function NotificationOverlay() {
  const { boundKeyboard, penetration } = useKeyboard();

  useEffect(() => {
    // Make 'x' transparent so it reaches the screen below
    const undoPenetration = penetration(['x']);
    return () => undoPenetration();
  }, []);

  useEffect(() => {
    return boundKeyboard(['d'], () => dismiss());
  }, []);

  return <Text>Press D to dismiss, X passes through</Text>;
}
```

## Composition Engine

For compound key actions (e.g. `3 w` = action × 3 times), use the composition engine:

```tsx
function Editor() {
  const { registryCompositionKey, hasPendingComposition, getCompositionContext, undoComposition, bufferedCompositionCount } = useKeyboard();

  useEffect(() => {
    registryCompositionKey({
      key: '3',
      flags: [],
      alternativeFlag: 'times',
      needs: [],
      execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
      undoAction: (ctx) => ({ value: undefined, lastFlag: null, steps: [] }),
    });
    registryCompositionKey({
      key: 'w',
      flags: [],
      alternativeFlag: 'action',
      needs: ['times'],
      optional: true,
      execute: (ctx) => {
        const times = (ctx.value as number) ?? 1;
        // ... perform action `times` times
        return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
      },
      undoAction: (ctx) => ({ value: undefined, lastFlag: null, steps: [] }),
    });
  }, []);

  return (
    <Text>
      {hasPendingComposition()
        ? `Composing: ${getCompositionContext().steps.join(' → ')}`
        : 'Press 3 then w, then Ctrl+Z to undo'}
    </Text>
  );
}
```

### Dependent Flags (chooseFlag)

Declare multiple potential flags and let the engine pick the right one:

```tsx
registryCompositionKey({
  key: 'w',
  flags: [
    { need: 'times', become: 'scalar' },
    { need: 'word',  become: 'delete' },
  ],
  alternativeFlag: 'action',
  needs: ['times', 'word'],
  optional: true,
  execute: (ctx) => ({
    value: ctx.value,
    lastFlag: null,  // null → engine picks from flags table
    steps: [...ctx.steps, 'w'],
  }),
});
```

Auto-propagation rules:
- `lastFlag: null` → engine auto-fills it
- Head key → uses `alternativeFlag`
- Chain key → `chooseFlag(lastFlag, flags)` picks matching `become`, falls back to `alternativeFlag`

### Undo & Runtime Validation

Bind a key (e.g. `Ctrl+Z`) to `undoComposition()` and pass a `valueSchema` for runtime safety:

```tsx
<KeyboardProvider
  valueSchema={{
    times: (v): v is number => typeof v === 'number',
    action: (v): v is number => typeof v === 'number',
  }}
>
```

```tsx
// Basic undo
const ctx = undoComposition();
// Undo by key count instead of sequences
const ctx = undoComposition(3, { byKey: true });
// Undo 2 keys with per-sequence ctx isolation
const ctx = undoComposition(2, { byKey: true, isolated: true });
```

### Subscribe to composition events

React component pattern using `subscribeComposition` to re-render on state changes:

```tsx
function StatusBar() {
  const [event, setEvent] = useState<string>('');
  const { subscribeComposition, getLastCompositionEvent } = useKeyboard();

  useEffect(() => {
    return subscribeComposition(() => {
      const e = getLastCompositionEvent();
      if (e?.type === 'started') setEvent(`Chain: ${(e as any).key}`);
      if (e?.type === 'broken') setEvent(`Broke on "${(e as any).key}"`);
      if (e?.type === 'completed') setEvent('Ready');
    });
  }, []);

  return <Text>{event}</Text>;
}
```

## See Also

- [ink-cartridge on GitHub](https://github.com/BAIGAOa/ink-cartridge)
- [@cartridge-engine/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
