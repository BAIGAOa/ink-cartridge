# API documentation conventions

Each public API gets its own file: `{apiName}.md`. File names match the method/property name — `processKey.md`, `sync.md`, `boundKeyboard.md`, etc.

## Required sections

### 1. Title

`# apiName` — the exact method/property name as exposed on `KeyboardEngine` or `CompositionEngine`.

### 2. Summary

One sentence. Answers: **what does this API do?** No implementation detail — just the effect from the caller's perspective.

```markdown
Process a keyboard event through the 9-stage pipeline and return whether any processor consumed it.
```

### 3. Signature

The full TypeScript signature copied from source, including generics and return type. For overloaded methods, list all variants.

```ts
processKey(input: string, key: unknown): boolean
```

### 4. Parameters

Table with columns: Param | Type | Description. "—" for no parameters.

### 5. Returns

What the caller gets back. "Nothing (`void`)" when appropriate.

### 6. Effect

**What state changes inside the engine.** This is the section that distinguishes engine docs from API reference cards. Describe:

- Which internal subsystems are affected (layers, registry, pipeline, composition engine, etc.)
- What observable side effects occur (focus changes, mode switches, pending sequence timers, layer mutations)
- When the effect takes place (synchronously on call vs. deferred)

Example for `setMode`:

```markdown
Switches the active mode immediately. Bindings tagged with `when: "modeName"` use the new mode on the very next key event. Does NOT retroactively affect any pending sequences or active composition chains.
```

### 7. Usage

At least one code example showing the **engine-level** call (framework-agnostic). Prefer realistic scenarios over trivial ones.

```ts
const handled = engine.processKey(input, key);
if (!handled) {
  console.log('no handler for', input);
}
```

For APIs also accessible through the React adapter (`useKeyboard()`), add a second example.

### 8. API interactions

A bullet list of **how this API interacts with other APIs.** Each entry:

- States the related API name (with a link to that API's doc)
- Explains the interaction: ordering constraints, mutual exclusion, side effects, shared state

```markdown
- **[`sync`](./sync.md)** — must be called before `processKey` on each render, otherwise the pipeline sees stale screen/overlay state.
- **[`boundKeyboard`](./boundKeyboard.md)** — key bindings registered via `boundKeyboard` on the current screen are matched at pipeline stage 8, so they only fire if no higher-priority stage consumed the event.
```

If an API has no interactions, write "None." — don't omit the section.

## Optional sections

### Configuration

For APIs that accept setup at construction time (e.g. `modes`, `valueSchema`), show both the constructor config and the runtime method.

### Throws

When, what error, and the `[keyboard-engine]` prefix.

### State diagram

ASCII diagram when the API changes the engine's internal state machine (modals, compositions, sequences). Keep it simple — no more than 8 lines.

## Writing style

These rules follow the project's top-level comment conventions.

### Explain why, not what

**Correct** (explains the design):
```markdown
`allowModal` exists so modals don't block every key. Without it, even arrow-key navigation within the modal itself would be swallowed.
```

**Wrong** (restates the signature):
```markdown
`allowModal` adds keys to the allow list.
```

### Use precise, not vague

- "Consumes the key event" — not "handles things"
- "Returns `true` if removed, `false` if the id was not registered" — not "returns a boolean"

### Code blocks

- Use `ts` for TypeScript, `tsx` for JSX/React
- Engine-level examples first, React adapter examples second
- Show the import line when it's not obvious: `import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';`

### Cross-references

Link to related APIs inline using relative paths: `[`sync`](./sync.md)`. Link to the composition engine for composition-related APIs: `[`CompositionEngine#setValueSchema`](../src/CompositionEngine.ts)`.

### Error prefix

The engine package uses `[ink-cartridge]` as its error prefix.

## Naming

| File | Documents |
|------|-----------|
| `processKey.md` | `KeyboardEngine#processKey` |
| `sync.md` | `KeyboardEngine#sync` |
| `boundKeyboard.md` | `KeyboardEngine#boundKeyboard` |
| `kickProcessor.md` | `KeyboardEngine#kickProcessor` / `KeyboardEngine#activeProcessor` |
| `mappingKey.md` | `CompositionEngine#addMapping` / `CompositionEngine#removeMappingKey` / `CompositionEngine#subscribeMapping` |
| `composition.md` | `CompositionEngine` class overview |
| `composition/setValueSchema.md` | `CompositionEngine#setValueSchema` |

Methods on `CompositionEngine` go in a `composition/` subdirectory.

## Checklist

Before submitting an API doc:

- [ ] Signature matches the source (check the `.ts` file — don't guess types)
- [ ] Engine-level example compiles (TypeScript valid, imports correct)
- [ ] Each API interaction entry has a working relative link
- [ ] Return value matches the source (void vs boolean vs unbinder)
- [ ] Error prefix is `[keyboard-engine]`
- [ ] "Effect" section describes internal state, not user-visible outcome
- [ ] No decorative separators, no self-praise ("This powerful API...")
