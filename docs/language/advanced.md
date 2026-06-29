# Advanced

## CLI Code Generation

Generate type-safe translation hooks:

```bash
npx ink-cartridge makeLanguageType ./locales ./src
```

Produces `i18n-types.d.ts` and `i18n.ts` — a typed `t()` function constrained to actual translation keys, with typed `params` for interpolation.

## Context-Based Gendered Forms

Use the `context` option for gendered or formal/informal variants:

```json
{
  "welcome": "Welcome",
  "welcome.male": "Welcome, sir",
  "welcome.female": "Welcome, madam"
}
```

```ts
t('welcome', { context: 'female' }) // → "Welcome, madam"
```

Set `defaultContext` on the provider for app-wide defaults.
