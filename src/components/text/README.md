# TextInput

A controlled / uncontrolled text input component integrated with the ink-cartridge keyboard and focus system.

## Quick Start

```tsx
import React, { useState } from 'react';
import { render } from 'ink';
import { TextInput } from 'ink-cartridge';

function App() {
  const [name, setName] = useState('');

  return (
    <TextInput
      focusId="name-field"
      value={name}
      onChange={setName}
      placeholder="Enter your name"
    />
  );
}
```

Uncontrolled variant — manages internal state automatically:

```tsx
import { UncontrolledTextInput } from 'ink-cartridge';

<UncontrolledTextInput
  focusId="search"
  initialValue="default"
  onSubmit={(val) => console.log(val)}
/>
```

## Props

### TextInputProps

| Prop | Type | Required | Default | Description |
|------|------|:--------:|:-------:|-------------|
| `focusId` | `string` | ✅ | — | Focus identifier bound to the keyboard system. Must be unique on the current screen. |
| `value` | `string` | ✅ | — | Current value of the input (controlled). |
| `onChange` | `(value: string) => void` | ✅ | — | Called when the value changes. |
| `placeholder` | `string` | ❌ | `''` | Text shown when value is empty. |
| `mask` | `string` | ❌ | — | Replace every character with this string (e.g. `'*'` for passwords). |
| `showCursor` | `boolean` | ❌ | `true` | Show a visual cursor and allow arrow-key navigation. |
| `highlightPastedText` | `boolean` | ❌ | `false` | Highlight the last pasted text block (multiple characters inserted at once). |
| `onSubmit` | `(value: string) => void` | ❌ | — | Called when Enter is pressed. |

### UncontrolledTextInputProps

| Prop | Type | Required | Default | Description |
|------|------|:--------:|:-------:|-------------|
| `initialValue` | `string` | ❌ | `''` | Initial value when the component mounts. |

Inherits all other props from `TextInputProps` **except** `value` and `onChange`.

## Keyboard Bindings

Bindings are registered on the active **focus target** — only the focused TextInput receives events. Tab / Shift+Tab switches focus between multiple inputs on the same screen automatically.

| Key | Action |
|-----|--------|
| Any character (`*` wildcard) | Insert the character at cursor position |
| `left` | Move cursor left |
| `right` | Move cursor right |
| `backspace` | Delete character to the left of the cursor |
| `delete` | Delete character to the right of the cursor |
| `return` | Submit current value via `onSubmit` (if provided) |

## Visual States

| State | Appearance |
|-------|-----------|
| **Focused, with value** | Text visible; cursor position is inverse-highlighted. |
| **Focused, empty** | Placeholder shown with the first character inverse-highlighted, remaining characters grey. |
| **Focused, empty, no placeholder** | A single inverse space (blinking cursor). |
| **Not focused, with value** | Plain text. |
| **Not focused, empty** | Grey placeholder (if provided). |
| **Masking** | Every displayed character replaced by the `mask` string. |

## Examples

### Basic Controlled Input

```tsx
const [username, setUsername] = useState('');

<TextInput
  focusId="username"
  value={username}
  onChange={setUsername}
  placeholder="Type your username..."
/>
```

### Password Input

```tsx
const [password, setPassword] = useState('');

<TextInput
  focusId="pwd"
  value={password}
  onChange={setPassword}
  mask="*"
  placeholder="••••••••"
/>
```

### With Submit

```tsx
const [query, setQuery] = useState('');

<TextInput
  focusId="search"
  value={query}
  onChange={setQuery}
  placeholder="Search..."
  onSubmit={(val) => console.log('Submitted:', val)}
/>
```

### Multiple Inputs on One Screen (Tab Focus)

```tsx
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Box flexDirection="column">
      <Text bold>Email</Text>
      <TextInput focusId="email" value={email} onChange={setEmail} />

      <Text bold>Password</Text>
      <TextInput focusId="password" value={password} onChange={setPassword} mask="*" />
    </Box>
  );
}
```

Press **Tab** to switch focus between the email and password fields.

### Uncontrolled Input

```tsx
<UncontrolledTextInput
  focusId="note"
  initialValue="Draft"
  onSubmit={(val) => saveNote(val)}
/>
```

## Integration Notes

- **Must be inside** `<KeyboardProvider>` which itself must be inside `<ScenarioManagementProvider>`.
- **Each instance** registers a focus target via `focusId` and unregisters it on unmount.
- **When not focused**, all key events for this component are silently skipped — no collision with other inputs on the same screen.
- **Wildcard `*` key** is handled by the keyboard system's `isNormalCharacter()` check: modifier combos (Ctrl/Ctrl+Shift/Meta/etc.) and special keys do not trigger the wildcard handler.

## TypeScript

```ts
import type { TextInputProps, UncontrolledTextInputProps } from 'ink-cartridge';
```
