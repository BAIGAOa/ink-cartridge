# When-expression Compiler

DSL compiler for the `when` condition system. Compiles string expressions into zero-argument boolean functions suitable for use as `when` callbacks throughout the keyboard system.

## Usage

```ts
import { createContext } from '@baigao_h/ink-kit';

// 1. Create a context and declare variables
const ctx = createContext()
  .varBool('isEditing', () => isEditing)
  .varStr('mode', () => currentMode)
  .varNum('count', () => itemCount);

// 2. Compile expressions — returns () => boolean
const whenEditing  = ctx.compile('isEditing');
const whenInsert   = ctx.compile('mode == "insert"');
const whenPositive = ctx.compile('count > 0');

// 3. Use as when callbacks
boundKeyboard(['enter'], handleEnter, { when: whenEditing });
globalKeys([{ key: 'escape', operate: handleEscape, when: whenInsert }]);

// 4. Reuse the context for multiple expressions
const complex = ctx.compile('isEditing && count > 0 && count <= 100');
```

## Variable Declaration

| Method | Type | Example DSL use |
|--------|------|----------------|
| `.varBool(name, getter)` | `boolean` | `isEditing`, `flag && true` |
| `.varStr(name, getter)` | `string` | `mode == "insert"` |
| `.varNum(name, getter)` | `number` | `count > 0` |

Each getter is called on every evaluation, so the expression always reflects current state.

## Expression Syntax

### Literals

```
true false          # boolean
"hello" 'world'     # string (single or double quoted)
42 3.14 -1          # number (integer or decimal; negative not yet supported)
```

### Operators (in precedence order, lowest first)

| Operator | Description | Operand types |
|----------|-------------|---------------|
| `\|\|` | Logical OR (short-circuit) | `boolean`, `boolean` |
| `&&` | Logical AND (short-circuit) | `boolean`, `boolean` |
| `==` `!=` | Equality / inequality | Same type both sides |
| `>` `<` `>=` `<=` | Relational comparison | `number`, `number` |
| `!` | Logical NOT | `boolean` |

### Grouping

Parentheses `( )` override default precedence.

## Error Handling

All errors throw at **compile time** (`compile()` call), not at evaluation time:

- **Syntax errors**: malformed operators, unterminated strings, unexpected characters
- **Type errors**: wrong operand types for operators, cross-type comparisons
- **Undefined variables**: referencing a name not declared via `varBool`/`varStr`/`varNum`

Error messages include the token position and a human-readable description:

```
Error: [ink-router-kit] Cannot compare 'string' with 'number' using '=='. Operands must have the same type.
```

## Architecture

The compiler has four internal stages:

1. **Lexer** (`lexer.ts`) — source string → `Token[]`
2. **Parser** (`parser.ts`) — `Token[]` → `ExprNode` AST (recursive descent)
3. **Type Checker** (`typeChecker.ts`) — validates AST against declared variable types
4. **Evaluator** (`evaluator.ts`) — evaluates AST at runtime, calling getters

The public API (`context.ts`) orchestrates all four stages behind `compile()`.
