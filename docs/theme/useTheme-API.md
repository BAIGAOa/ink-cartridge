# useTheme

Access the current theme's colors and styles.

## Signature

```ts
function useTheme(): ThemeContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `color(key)` | `(key: string) => string \| undefined` | Get a color value. |
| `style(key)` | `(key: string) => boolean \| undefined` | Get a style boolean. |
| `themeId` | `string` | Current active theme ID. |
| `themes` | `string[]` | All available theme IDs. |
| `setTheme(id)` | `(id: string) => void` | Switch theme. |
| `mergeTheme(paths)` | `(paths: string[]) => void` | Overlay values from additional theme directories. |
| `addThemes(paths)` | `(paths: string[]) => void` | Add entirely new themes from directories. |

## Best Practice

```tsx
function Header() {
  const { color, style } = useTheme();
  return (
    <Text color={color('primary')} bold={style('bold')}>
      My App
    </Text>
  );
}
```
