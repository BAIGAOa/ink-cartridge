# Language System (i18n)

## Why

Terminal apps need to support multiple languages. The i18n system provides a flat key-value translation store with `{param}` interpolation and context-based fallback, plus compile-time type safety via CLI code generation.

## Architecture

```
LanguageProvider (JSON files or inline resources)
    │
    ▼
useI18n() → { t(key, options?), setLanguage(lang), currentLanguage }
```

Translation keys are dot-separated (nested JSON is flattened). The `t()` function tries: `key.context` → `key` → fallback language → raw key string.

## API Index

| API | Purpose |
|-----|---------|
| [LanguageProvider](./LanguageProvider-API.md) | Load and provide translations |
| [useI18n](./useI18n-API.md) | Access translation functions |

## Advanced

See [advanced.md](./advanced.md)
