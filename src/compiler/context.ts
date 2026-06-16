import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { typeCheck } from './typeChecker.js';
import { evaluate } from './evaluator.js';
import type { VarBinding } from './types.js';

/**
 * Build a compiled when-condition from a DSL expression string.
 *
 * Variables are declared via the {@link WhenContext.varBool}, {@link WhenContext.varStr},
 * and {@link WhenContext.varNum} methods before calling {@link WhenContext.compile}.
 *
 * @example
 * ```ts
 * const when = createContext()
 *   .varBool('isEditing', () => isEditing)
 *   .varNum('count', () => count)
 *   .compile('isEditing && count > 0');
 *
 * boundKeyboard(['enter'], handler, { when });
 * ```
 * @2026-06-16 v3.5.0
 */
export function createContext(): WhenContext {
  return new WhenContextImpl();
}

export interface WhenContext {
  /**
   * Declare a boolean variable for use in expressions.
   *
   * @param name   - The variable name as it appears in DSL source.
   * @param getter - A function that returns the current boolean value at evaluation time.
   */
  varBool(name: string, getter: () => boolean): WhenContext;

  /**
   * Declare a string variable for use in expressions.
   *
   * @param name   - The variable name as it appears in DSL source.
   * @param getter - A function that returns the current string value at evaluation time.
   */
  varStr(name: string, getter: () => string): WhenContext;

  /**
   * Declare a numeric variable for use in expressions.
   *
   * @param name   - The variable name as it appears in DSL source.
   * @param getter - A function that returns the current number value at evaluation time.
   */
  varNum(name: string, getter: () => number): WhenContext;

  /**
   * Compile a DSL expression into a callable when-condition.
   *
   * The expression is tokenized, parsed, type-checked, and bound to the
   * declared variable getters. The returned function calls every bound
   * getter on each invocation, so it always reflects current state.
   *
   * @param source - The DSL expression string (e.g. `"isEditing && count > 0"`).
   * @returns A zero-argument function that evaluates the expression and returns
   *          `true` or `false`.
   * @throws {WhenCompileError} If the source has syntax errors, references
   *         undeclared variables, or contains type mismatches.
   */
  compile(source: string): () => boolean;
}

class WhenContextImpl implements WhenContext {
  private _vars: VarBinding[] = [];

  varBool(name: string, getter: () => boolean): WhenContext {
    this._vars.push({ name, type: 'boolean', getter });
    return this;
  }

  varStr(name: string, getter: () => string): WhenContext {
    this._vars.push({ name, type: 'string', getter });
    return this;
  }

  varNum(name: string, getter: () => number): WhenContext {
    this._vars.push({ name, type: 'number', getter });
    return this;
  }

  compile(source: string): () => boolean {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    typeCheck(ast, this._vars);
    return () => evaluate(ast, this._vars);
  }
}
