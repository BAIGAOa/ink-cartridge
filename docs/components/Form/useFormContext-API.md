# useFormContext

Access the form's values, errors, and `submitForm` from any descendant (not just inside `Field`).

## Signature

```ts
function useFormContext(): FormContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `values` | `Record<string, any>` | All field values. |
| `errors` | `Record<string, string \| undefined>` | All field errors. |
| `setFieldValue` | `(name: string, value: any) => void` | Update a field + clear its error. |
| `registerField` | `(name: string, defaultValue?, rules?, focusId?) => void` | Register a field with validation (used internally by Field). |
| `unregisterField` | `(name: string) => void` | Unregister a field on unmount. |
| `submitForm` | `() => void` | Validate and submit. |

Throws if called outside a `<Form>`.

## Best Practice

Use for a custom submit button or to read cross-field values:

```tsx
function SubmitButton() {
  const { submitForm, errors } = useFormContext();
  const hasErrors = Object.values(errors).some(Boolean);
  return <Text dimColor={hasErrors}>Press Ctrl+S to submit</Text>;
}
```
