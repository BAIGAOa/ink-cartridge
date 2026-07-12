# UncontrolledTextInput

Self-managing TextInput.

## Props

```ts
{
  initialValue?: string;       // default ''
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
