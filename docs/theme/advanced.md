# Advanced

## CLI Code Generation

Generate type-safe theme hooks:

```bash
npx ink-cartridge makeThemeType ./themes ./src
```

This produces `theme-types.d.ts` and `theme.ts` — a typed `useTheme()` that constrains `color()` and `style()` to the actual keys in your theme files.

## Runtime Theme Merging

Add new themes or overlay values without restarting:

```tsx
const { mergeTheme, addThemes } = useTheme();

// Overlay new values onto existing themes (silently skips unknown theme IDs — only themes
// already in the base set are updated)
mergeTheme(['./themes/extension']);

// Add entirely new theme variants (throws if a theme ID already exists or if keys don't
// match the existing set)
addThemes(['./themes/extra']);
```
