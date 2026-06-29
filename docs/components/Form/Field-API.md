# Field

A single form field with validation rules. Uses render-prop pattern — the child function receives `{ value, error, onChange, focusId }`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | yes | — | Unique field name. |
| `children` | `(props: FieldRenderProps) => ReactNode` | yes | — | Render prop. |
| `rules` | `Validator[]` | no | — | Validation rules (first error wins). |
| `defaultValue` | `any` | no | — | Used if Form has no initial value for this name. |
| `focusId` | `string` | no | `"<name>-field"` | Override auto-generated focus target. |

## FieldRenderProps

| Prop | Type | Description |
|------|------|-------------|
| `value` | `any` | Current field value. |
| `error` | `string \| undefined` | Validation error message, or undefined if valid. |
| `onChange` | `(value: any) => void` | Update field value + clear error. |
| `focusId` | `string` | The field's focus target ID (auto or explicit). |

## Validator

```ts
type Validator = (value: any, values: Record<string, any>) => string | undefined;
```

Return a string error message, or `undefined` if valid.

## Best Practice

```tsx
const required: Validator = (v) => (!v ? 'Required' : undefined);
const minLength = (n: number): Validator => (v) =>
  String(v).length < n ? `Min ${n} chars` : undefined;

<Field name="username" rules={[required, minLength(3)]}>
  {({ value, onChange, error, focusId }) => (
    <Box>
      <TextInput focusId={focusId} value={value} onChange={onChange} />
      {error && <Text color="red">{error}</Text>}
    </Box>
  )}
</Field>
```
