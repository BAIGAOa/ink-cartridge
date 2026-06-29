# LanguageProvider

Load translation resources and provide them via context.

## Signature

```tsx
function LanguageProvider({
  children,
  resources,
  path,
  defaultLanguage,
  fallbackLanguage,
  defaultContext,
}: LanguageProviderProps): JSX.Element
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | App content. |
| `resources` | `Record<string, Record<string, string>>` | Inline translation maps by locale. |
| `path` | `string` | Directory of `{locale}.json` files (alternative to `resources`). |
| `defaultLanguage` | `string` | Initial locale. Defaults to first available. |
| `fallbackLanguage` | `string` | Fallback locale for missing keys. |
| `defaultContext` | `string` | Default context suffix applied to every `t()` call. |

Either `path` or `resources` must be provided.

## Best Practice

```tsx
<LanguageProvider path="./locales" defaultLanguage="en" fallbackLanguage="en">
  <App />
</LanguageProvider>
```
