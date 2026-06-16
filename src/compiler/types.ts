import type { ValueType } from './TokenType.js';

/**
 * A single variable binding declared by the user.
 *
 * Each binding maps a source-level name to a typed getter function
 * that is called at evaluation time to obtain the current value.
 */
export interface VarBinding {
  /** The variable name as written in DSL source. */
  name: string;
  /** The declared type of this variable. */
  type: ValueType;
  /** Returns the current value at evaluation time. */
  getter: () => unknown;
}
