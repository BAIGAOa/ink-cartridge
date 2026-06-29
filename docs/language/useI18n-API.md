# useI18n

Access translation and language switching functions.

## Signature

```ts
function useI18n(): I18nContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `t(key, options?)` | `(key: string, options?: { params?, context? }) => string` | Translate a key. |
| `setLanguage(lang)` | `(lang: string) => void` | Switch language. |
| `getLanguages()` | `() => string[]` | List available locales. |
| `mergeLanguage(paths)` | `(paths: string[]) => void` | Merge additional locale directories. |
| `setDefaultContext(ctx?)` | `(ctx?: string) => void` | Set default context. |
| `currentLanguage` | `string` | Current locale code. |

## t() resolution order

1. `key.context` (if context provided or default set)
2. `key` (bare)
3. Same lookup in `fallbackLanguage`
4. Raw key string

## Interpolation

`{param}` placeholders in templates are replaced with provided params:

```ts
// Template: "Welcome, {name}"
t('welcome', { params: { name: 'Alice' } })  // → "Welcome, Alice"
```

## Best Practice

```tsx
function Greeting() {
  const { t } = useI18n();
  return <Text>{t('greeting', { params: { user: 'Alice' } })}</Text>;
}
```
