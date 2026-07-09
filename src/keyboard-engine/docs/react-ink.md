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

## See Also

- [ink-cartridge on GitHub](https://github.com/BAIGAOa/ink-cartridge)
- [@cartridge-engine/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
