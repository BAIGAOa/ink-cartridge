# UncontrolledTextInput

Self-managing TextInput with optional storage persistence.

## Props

```ts
{
  initialValue?: string;       // default ''
  storage?: StorageAPI;
  storageKey?: string;         // default "text:<focusId>"
} & Omit<TextInputProps, 'value' | 'onChange'>
```

All other props same as [TextInput](./TextInput-API.md).

## Best Practice

Use for simple inputs where you don't need to track the value externally:

```tsx
<UncontrolledTextInput
  focusId="name"
  initialValue="Alice"
  placeholder="Enter your name"
/>
```
