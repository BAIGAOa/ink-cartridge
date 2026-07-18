# ThemeProvider

Load theme definitions and provide them via context.

## Signature

```tsx
function ThemeProvider({
  children,
  path,
  themes,
  defaultTheme,
}: ThemeProviderProps): JSX.Element
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | App content. |
| `path` | `string` | Directory of `{id}.json` theme files (alternative to `themes`). |
| `themes` | `ThemeDefinition[]` | Inline theme definitions (alternative to `path`). Defaults to `[]`. |
| `defaultTheme` | `string` | Initial theme ID. Defaults to the first available. |

Either `path` or `themes` must be provided.

## Theme Definition

```json
{
  "id": "dark",
  "primary": "cyan",
  "background": "black",
  "bold": true
}
```

## Best Practice

Use `themes` for inline definitions during development; switch to `path` for production:

```tsx
<ThemeProvider path="./themes" defaultTheme="dark">
  <App />
</ThemeProvider>
```
