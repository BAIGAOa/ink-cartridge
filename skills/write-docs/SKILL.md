---
name: write-docs
description: Write, update, sync, or fix documentation for ink-cartridge. Use when the user wants to write docs, update API docs, sync docs with source changes, or fix documentation errors.
---

## Entry

**Must** first ask the user to choose an interaction mode:

1. **Auto-explore** — AI reads source and existing docs, analyzes, presents a draft, writes after user confirms
2. **Step-by-step** — AI asks the user one question at a time; user drives the scope

Then **must** ask: new doc or updating existing doc?

- **Updating existing doc** — user **must** specify which file and what changed. **Must not** guess from vague descriptions. Ask for specifics.
- **New doc** — proceed to auto-explore or step-by-step.

## Auto-explore workflow (new doc)

1. Ask: which API/component needs docs?
2. Read the source file — extract signature, props types, options types, return type
3. Read at least one existing API doc from the same subsystem to match style
4. Draft the complete doc and present it to the user
5. User confirms; write the file
6. **Must** update the subsystem README index table (`docs/<subsystem>/README.md`)
7. **Must** update the top-level docs index (`docs/README.md`) if entry is needed
8. **Must** update the root `README.md` Documentation section (`<details>` block) with the new link
9. **Must** check `src/index.ts` — if this API is public and not exported, warn the user

## Auto-explore workflow (update existing doc)

1. Read the existing doc file
2. Read the source for the changed props/signatures
3. Identify precise differences
4. Modify only the affected sections; **must not** rewrite the whole file
5. Show the diff to the user for confirmation
6. Write the changes

## Step-by-step workflow (new doc)

1. Ask: which API/component needs docs?
2. Read the source, extract signature/props
3. List the sections to be written; user confirms
4. Generate the doc
5. Ask: does any README index need updating?
6. **Must** check `src/index.ts`

## Step-by-step workflow (update existing doc)

1. Ask: which file and what specifically changed?
2. Read existing doc + source
3. Show the identified differences; user confirms
4. Modify affected sections only

## Doc structure conventions

**Must** read existing docs in the same subsystem before writing. **Must** match their section structure, table headers, wording, and code example style exactly.

Typical API doc sections (follow existing, not this list):
- `# <Name>` — one-line summary
- `## Signature` — TypeScript signature block
- `## Props` or `## Options` — table: Prop, Type, Required, Default, Description
- `## Returns` — return value description
- `## Best Practice` — code examples

Component API docs may also include `## Keyboard` table.

## Non-negotiable conventions

- **Must** match the style of existing docs in the same subsystem — never invent new section names or table formats
- **Must** update all three index locations for a new API: subsystem README, `docs/README.md`, root `README.md`
- **Must** check `src/index.ts` for public API export; warn if missing
- **Must not** write docs in `docs-agents/` (those are manually maintained agent reference files)
- **Must not** rewrite entire files for minor prop additions — modify only affected sections

## Audit reminder

After writing docs, **must** remind the user: verify the doc matches the current source truth — no stale props, no missing signatures.
