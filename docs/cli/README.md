# CLI

The `ink-cartridge` command-line tool provides scaffolding and code generation for your TUI project.

## Commands

### `init` — Scaffold a new project

```bash
npx ink-cartridge init <project-name>
```

Creates a new directory with a ready-to-run ink-cartridge project: `package.json`, `tsconfig.json`, and a `src/index.tsx` entry point with a two-screen app (Menu + Game). Runs `npm install` automatically.

### `initTheme` — Interactive theme scaffold

```bash
npx ink-cartridge initTheme [--output <dir>]
```

Walks you through creating a theme file interactively. Output defaults to `./themes/`.

### `makeLanguageType` — Generate typed i18n bindings

```bash
npx ink-cartridge makeLanguageType <source-dir> <output-dir> [options]
```

Generates TypeScript type definitions from your locale JSON files, enabling autocomplete and type-safe translation keys.

### `makeThemeType` — Generate typed theme bindings

```bash
npx ink-cartridge makeThemeType <source-dir> <output-dir> [options]
```

Generates TypeScript type definitions from your theme JSON files, enabling autocomplete and type-safe theme colors and styles.

## Options

`makeLanguageType` and `makeThemeType` share these options:

| Option | Description |
|--------|-------------|
| `--watch` | Re-generate types on every file change |
| `--debounce <ms>` | Debounce delay in milliseconds (default `500`) |
| `--from <pkg>` | Package name to import types from (default `ink-cartridge`) |
