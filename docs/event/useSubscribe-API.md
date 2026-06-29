# useSubscribe

Subscribe to an event with automatic cleanup on unmount. The subscription re-binds whenever a dependency changes, so the callback always closes over the latest state.

## Signature

```ts
function useSubscribe(
  event: string,
  callback: (payload: any) => void,
  deps?: any[]
): void
```

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `event` | `string` | **required** | Event name. |
| `callback` | `(payload: any) => void` | **required** | Called on each emit. |
| `deps` | `any[]` | `[]` | Dependency array — same semantics as `useEffect`. When any dep changes, the subscription re-binds with the latest callback. |

## Best Practice

Put state values the callback references into `deps`:

```tsx
function Editor() {
  const [content, setContent] = useState('');

  // content is in deps, so callback always sees the latest value
  useSubscribe('SAVE', () => {
    writeToDisk(content);
  }, [content]);

  return <Text>{content}</Text>;
}
```

For callbacks that don't reference changing state, omit deps (default `[]`):

```tsx
useSubscribe('QUIT', () => process.exit(0));
```
