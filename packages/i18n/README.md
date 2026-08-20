# @cartridge-engine/i18n

Type-safe internationalization for Ink apps — a standalone package, imported on demand.

## Install

```bash
npm install @cartridge-engine/i18n
```

## Runtime

### `LanguageProvider`

Context provider for internationalization (i18n). Loads translation resources either from a directory of `{locale}.json` files (via the `path` prop) or from a pre-built inline object (via `resources`).

```tsx
<LanguageProvider
  resources={{ en: { hello: 'Hello' }, zh: { hello: '你好' } }}
  defaultLanguage="en"
>
  <App />
</LanguageProvider>
```

### `useI18n`

Access the i18n API from within a component tree wrapped by `LanguageProvider`. Returns `{ t, setLanguage, getLanguages, mergeLanguage, currentLanguage, setDefaultContext }`.

```tsx
const { t } = useI18n();
<Text>{t('hello')}</Text>
```

## CLI — `make-language-type`

Generate type-safe i18n bindings from a directory of `{locale}.json` files:

```bash
npx make-language-type <source-dir> <output-dir> [--watch] [--debounce <ms>] [--from <pkg>]
```

`--from` defaults to `@cartridge-engine/i18n`.

## Types

- `LanguageProviderProps`
- `I18nContextValue`
