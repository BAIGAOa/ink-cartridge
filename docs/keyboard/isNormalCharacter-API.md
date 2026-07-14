# isNormalCharacter

Check whether a keyboard event represents a normal (printable) character — no modifier keys, no special keys.

## Signature

```ts
function isNormalCharacter(input: string, key: unknown): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | The character input from the framework (e.g. Ink's `useInput` first argument). |
| `key` | `unknown` | The raw key event object from the framework (e.g. Ink's `useInput` second argument). |

## Returns

`true` if the event is a normal character (no ctrl, meta, shift, or special keys). `false` otherwise.

## Usage

Exported as a standalone utility — useful for framework adapters and custom input components:

```tsx
import { isNormalCharacter } from 'ink-cartridge';

function CustomInput({ onChange }) {
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['*'], (input, key) => {
      if (isNormalCharacter(input, key)) {
        onChange(input);
      }
    });
  }, []);
  // ...
}
```

For text input components, use in combination with `enableWildcardPriority` and the `'*'` wildcard key to capture all printable characters while still allowing special key bindings to pass through.
