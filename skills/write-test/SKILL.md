---
name: write-test
description: Write tests for ink-cartridge. Use when the user wants to write tests, add tests, or create test files.
---

## Entry

**Must** first ask the user to choose an interaction mode:

1. **Auto-explore** — read source and existing tests, analyze gaps, present a checklist, write after user confirms
2. **Step-by-step** — ask the user one question at a time; user drives the scope

## Auto-explore workflow

1. Read the target module's source
2. Read existing test files (`tests/<subsystem>/base/*.test.*` and `tests/<subsystem>/*.test.*`)
3. Read related type definitions
4. Analyze test points. **Must** group by category:
   - **Core behavior** — normal rendering, defaults, primary interactions
   - **Edge cases** — empty values, extremes, empty arrays, undefined
   - **Error paths** — invalid input, exceptional states, throws
   - **Integration** — cross-system interaction (navigation + keyboard, form + field)
5. Compare against existing tests; mark each point as "covered" or "missing"
6. Present the checklist to the user; user may add, remove, or modify items
7. Write the tests after user confirmation
8. **Must** run `npx tsc -p tests/tsconfig.json --noEmit` and ensure it passes
9. **Must** run `npm test` after tsc passes

If tsc reports any type errors, **must** fix them and re-run until clean. **Must not** run tests while type errors remain.

When `npm test` fails, **must not** auto-fix. **Must** report the failure and let the user decide next steps.

## Step-by-step workflow

1. Ask: which module/component to test?
2. Ask: new test file or append to an existing one?
3. After reading source and existing tests, list testable points and ask "test X?" one at a time
4. For each confirmed point, ask for details (input, expected result, special scenarios)
5. Generate tests when the user indicates no more additions
6. **Must** run `npx tsc -p tests/tsconfig.json --noEmit`
7. **Must** run `npm test` after tsc passes

No fast-exit shortcut.

## File placement

**Must** ask the user where to place the new test file. **Must not** decide on its own.

## `_helpers.tsx`

When the target subsystem has no `_helpers.tsx` and the test file needs helpers, **must** auto-generate one. Only include helpers the test actually uses. **Must not** pre-guess future needs.

## TDD scenario

If the target module's source file does not exist yet, **must** ask: TDD (tests first) or source at a different path? **Must not** error out directly.

## Non-negotiable conventions

- Tests go in `tests/`, **never** in `src/__tests__/`
- Basic logic tests → `tests/<subsystem>/base/`; complex/multi-system tests → `tests/<subsystem>/`
- Use `ink-testing-library`'s `render()`; environment is node
- `clearRegistry()` and `clearDispatchers()` in `beforeEach`
- `flush()` (50ms setTimeout) before simulating key presses
- `stdin.write()` **must** be wrapped in `act()`
- Escape key (`\x1b`) is unreliable; **must not** test it via stdin
- Provider nesting: `ScenarioManagementProvider` → `KeyboardProvider` (reversed breaks silently)
- Black-box only — test observable behavior, not internal state
- One behavior per test; no redundant assertions
- Follow naming patterns of existing tests in the same directory

## Audit reminder

After all tests pass, **must** remind the user: verify each test locks down a behavior that could realistically break — not just passes.
