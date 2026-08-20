# @cartridge-engine/theme

Theming for Ink apps — a standalone package, imported on demand.

## Install

```bash
npm install @cartridge-engine/theme
```

## Runtime

### `ThemeProvider`

Context provider for theming. Loads theme definitions either from a directory of `{id}.json` files (via the `path` prop) or from pre-built inline objects (via `themes`).

```tsx
<ThemeProvider
  themes={[
    { id: 'dark', primary: 'cyan', border: 'bold' },
    { id: 'light', primary: 'blue', border: 'thin' },
  ]}
  defaultTheme="dark"
>
  <App />
</ThemeProvider>
```

### `useTheme`

Access the theme API from within a component tree wrapped by `ThemeProvider`. Returns `{ color, style, themeId, themes, setTheme, mergeTheme, addThemes }`.

```tsx
const { color } = useTheme();
<Text color={color('primary')}>Hello</Text>
```

## CLI

### `make-theme-type`

Generate type-safe theme bindings from a directory of `{id}.json` theme files:

```bash
npx make-theme-type <source-dir> <output-dir> [--watch] [--debounce <ms>] [--from <pkg>]
```

`--from` defaults to `@cartridge-engine/theme`.

### `init-theme`

Interactive theme scaffold:

```bash
npx init-theme [--output <dir>]
```

## Types

- `ThemeDefinition`
- `ThemeProviderProps`
- `ThemeContextValue`
