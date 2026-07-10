# keyboard-engine test conventions

## Directory layout

Group tests by subsystem. Each subsystem dir MUST contain a `base/` subdirectory for unit tests. Integration and complex tests go directly under the subsystem dir.

```
tests/
  binding/
    base/          # unit tests
    <integration>  # directly under binding/
  global-keys/
    base/          # unit tests
    <integration>  # directly under global-keys/
```

## Language

All test names, describe blocks, comments, and inline strings MUST be in English. No Chinese (or any other non-English language) in test files.

## Test style

- All unit tests MUST follow **Given / When / Then** structure:
  1. **Given** — set up preconditions and inputs
  2. **When** — execute the action under test
  3. **Then** — assert expected outcomes
- Black-box first, white-box only when necessary. Design tests from the public API.
- Tests that require an environment that can't be mocked may be skipped. Annotate at the top of the file:

```
// skip: <description of what is skipped>
// why: <reason>
```

- Use `skip-1`, `skip-2`, etc. when there are multiple skipped scenarios in one file.
- No decorative comments (separator lines, banners, ASCII art).
