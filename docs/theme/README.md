# Theme System

## Why

Terminal apps have no CSS. The theme system provides a flat key-value store for colors and styles that can be switched at runtime, with compile-time type safety via the CLI code generator.

## Architecture

```
ThemeProvider (JSON files or inline definitions)
    │
    ▼
useTheme() → { color(key), style(key), setTheme(id), themes[] }
```

All themes must have identical keys. `color()` returns Ink color strings; `style()` returns booleans. Themes can be merged and extended at runtime via `mergeTheme` and `addThemes`.

## API Index

| API | Purpose |
|-----|---------|
| [ThemeProvider](./ThemeProvider-API.md) | Load and provide themes |
| [useTheme](./useTheme-API.md) | Access current theme values |

## Advanced

See [advanced.md](./advanced.md)
