---
name: public-api
description: Conventions for public API exports in src/index.ts — JSDoc format and documentation sync
paths: ["src/index.ts"]
---

## JSDoc

Every public function, component, type, or constant exported from `src/index.ts` must have an English JSDoc comment covering:

- **Description** — what the API does
- **`@param`** — each parameter documented
- **`@returns`** — return value described
- **`@throws`** — possible errors
- **`@example`** — usage example (when helpful)
- **Boundary behavior** — e.g., what happens when a parameter is `undefined`

```ts
/**
 * Register a component as a screen in the navigation tree.
 *
 * @param component - The React component (used as the unique token).
 * @param template  - Default props for the component.
 * @param options   - Optional registration options (e.g. `parent`).
 * @throws {Error} If the component has already been registered.
 * @example
 * ```tsx
 * registerComponent(Menu, {});
 * registerComponent(Game, { level: 1 }, { parent: Menu });
 * ```
 */
export function registerComponent(...): void;
```

## Documentation sync

When changing a public API:

1. Update the corresponding file under `docs/` or the relevant README.
2. Verify `src/index.ts` re-exports the change.
3. If the change doesn't affect existing documentation (e.g., bug fix with no API change), no doc update is required.
