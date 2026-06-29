# closeDevTool

Close the development panel. Safe to call even when the panel isn't open.

## Signature

```ts
function closeDevTool(): void
```

No-op if the dev tool is not open. Use inside an Escape handler within the dev panel, or from anywhere to dismiss it programmatically.
