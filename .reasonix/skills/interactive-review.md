---
name: interactive-review
description: Interactive code review: analyzes changes, asks user one-at-a-time whether each finding is a real bug, then offers fixes for confirmed issues.
---

# Interactive Code Review

When invoked, perform a thorough review of the code change or module the user
specified (or the current branch diff if nothing is specified).

## Core principle: ask, don't assume

After finding each potential issue, **pause and ask the user** whether it's
a real bug before moving on. Never batch multiple issues into one question.

## Process

1. **Read** the relevant source files and tests.
2. **Analyze** for correctness, security, edge cases, missing tests, hidden behavior, and conventions.
3. **Present findings one at a time.** For each finding:
   - State what you found, where it is (file:line), and what behavior you observed.
   - Explain why it matters — what could go wrong.
   - Ask a clear yes/no question: "Is this a bug?" or "Should this be fixed?"
   - Provide 2-3 concrete options the user can pick from.
   - Wait for the user's answer before presenting the next finding.
4. After all findings are addressed, offer to apply fixes for confirmed bugs.

## Finding severity order

Present findings in this order (most actionable first):
1. **Runtime bugs** — crashes, wrong outputs, state corruption
2. **Silent failures** — errors swallowed, missing validation
3. **Edge cases** — empty/null/boundary/unexpected input
4. **Missing tests** — untested critical paths or regression gaps
5. **Hidden behavior** — undocumented side effects, misleading API names
6. **Convention violations** — project style, patterns

## Question format

For each finding, use the ask tool with a single question. Example:

> **Finding:** `stop()` with `stopAction: true` silently ignores unregistered action IDs at `provider.tsx:604`.
> **Impact:** If a developer mistypes an actionId, the stop silently does nothing — the key propagates to lower layers with no warning.
> **Is this a bug?**

Option A: "Yes, it should throw an error"  
Option B: "No, silent no-op is the intended behavior"  
Option C: "Warn via console but don't throw"

## Constraints

- **One question at a time.** Never present multiple findings in one ask call.
- **Be concise.** Each finding description should be 3-5 sentences max.
- **Skip the obvious.** Don't ask about trivial formatting or naming preferences.
- **Respect the user's answer.** If they say it's not a bug, move on without arguing.
