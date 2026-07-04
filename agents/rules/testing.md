---
name: testing
description: Test conventions for tests/ — structure, environment, patterns, and ink-testing-library usage
paths: ["tests/**/*"]
---

## Environment

All tests under `tests/` run in `node` environment (configured in `vitest.config.ts` via `environmentMatchGlobs`). No DOM available — use `ink-testing-library` for Ink component rendering.

## Directory structure

```
tests/<subsystem>/
├── base/              # basic logic tests
│   ├── _helpers.tsx   # shared utilities (render helpers, mock components, setup/teardown)
│   └── *.test.ts(x)
└── *.test.tsx         # complex / special-case tests
```

- `base/` — fundamental behavior tests. One file per API surface.
- `_helpers.tsx` — shared render functions, mock components, setup/teardown. Do NOT import from another subsystem's `_helpers`.
- Complex tests (multi-system interaction, edge cases, regressions) go directly in `<subsystem>/`.

## Principles

- **Black-box** — test observable behavior, not internal state.
- **Concise** — each test targets one behavior. No redundant assertions.
- **Precise** — use exact matchers. Prefer `toHaveBeenCalledWith(...)` over `toHaveBeenCalled()`.
- **Non-redundant** — if a behavior is already covered in `base/`, don't duplicate.
- Every test must lock down a behavior that could realistically break.
- All files under `tests/` must compile (`tsc` passes under `tests/tsconfig.json`).

## Setup & teardown

```ts
beforeEach(() => {
  clearRegistry();
  clearDispatchers();
});
```

## ink-testing-library

`render()` from `ink-testing-library` synchronously renders Ink components in node environment. Returns `{ lastFrame, stdin, unmount }`:

- `lastFrame(): string` — current rendered output
- `stdin: { write(data: string): void }` — simulate key presses
- `unmount(): void` — cleanup

React effects are NOT synchronous. After navigation or registration, call `flush()` (50ms setTimeout) to drain the microtask queue before simulating key presses:

```ts
export async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}
```

Wrap `stdin.write()` in `act()`:

```ts
await act(async () => {
  stdin.write(key);
});
```

**Limitations:** Escape (`\x1b`) and some special keys are unreliable with `stdin.write`. Do not test escape key behavior via stdin.

## Provider nesting

```
ScenarioManagementProvider → KeyboardProvider → AppHost → CurrentScreen
```

`KeyboardProvider` MUST be inside `ScenarioManagementProvider`.

## Helpers

Shared render helpers in `_helpers.tsx`:

- Expose `{ lastFrame, stdin, unmount }` to tests
- Register the standard screen tree
- Accept setup callbacks for binding keys during mount
- Return typed result interfaces, not generic objects
