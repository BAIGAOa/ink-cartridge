---
name: write-changelog
description: Write the .changeset changelog file for the current change
---

## When

- Runs at the end of a coding task, on user invocation.
- If no file exists under `.changeset/`, STOP and ask the user how to proceed — they may need to run `npx changeset` first, or this was a mis-trigger.

## Steps

1. **Confirm scope.** Ask the user: cover the whole current change, or only part of it?

2. **Write ONE file** `.changeset/<name>.md`:
   - Frontmatter: one line per affected package — `"<package>": <patch|minor|major>`. Never write version numbers — changesets/action derives them.
   - Body: one bullet per change, in English, with a type prefix:

     `- **<fix|feat|docs|breaking>**(<scope>): <what and why>`

3. **Merge, don't split.** Multi-package changes share one file: multiple frontmatter lines, one body.

## Verify

- [ ] File exists under `.changeset/`
- [ ] Frontmatter covers every affected package; bump types only, no version numbers
- [ ] Body is English bullets in `- **type**(scope):` format

## Example

```md
---
"@cartridge-engine/keyboard-engine": patch
---

- **fix**(engine): only the topmost modal layer receives mouse events
```
