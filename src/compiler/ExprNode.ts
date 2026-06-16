/**
 * AST node types produced by the parser.
 *
 * After the lexer produces a token stream, the parser builds a tree of
 * these nodes. Each node represents one sub-expression in the source.
 *
 * The node types form a discriminated union on their `type` field so the
 * evaluator can switch on the node kind without inspecting runtime values.
 *
 * @2026-06-16 v3.5.0
 */
import type { ValueType } from './TokenType.js';

export type ExprNode =
  | BooleanLiteral
  | StringLiteral
  | NumberLiteral
  | Identifier
  | UnaryOp
  | BinaryArithmeticOp
  | LogicalBinaryOp
  | Comparison;

/** A literal boolean value (`true` or `false`). */
export interface BooleanLiteral {
  type: 'BooleanLiteral';
  /** The type of this literal, always `'boolean'`. */
  valueType: ValueType;
  /** The boolean value. */
  value: boolean;
}

/** A literal string value (single or double quoted). */
export interface StringLiteral {
  type: 'StringLiteral';
  /** The type of this literal, always `'string'`. */
  valueType: ValueType;
  /** The string content with quotes stripped and escapes resolved. */
  value: string;
}

/** A literal numeric value (integer or decimal). */
export interface NumberLiteral {
  type: 'NumberLiteral';
  /** The type of this literal, always `'number'`. */
  valueType: ValueType;
  /** The numeric value. */
  value: number;
}

/**
 * A reference to a named variable in the evaluation context.
 *
 * The name is resolved at evaluation time via {@link EvaluationContext.lookup}.
 * If the name is not found, evaluation throws.
 */
export interface Identifier {
  type: 'Identifier';
  /** The variable name as written in the source. */
  name: string;
}

/** Logical NOT (`!`) or arithmetic negation (`-`) applied to a single operand. */
export interface UnaryOp {
  type: 'UnaryOp';
  /** The unary operator: `!` (logical not) or `-` (arithmetic negation). */
  op: '!' | '-';
  /** The sub-expression to operate on. `!` requires boolean; `-` requires number. */
  operand: ExprNode;
}

/**
 * A binary arithmetic operation: addition or subtraction.
 *
 * Both operands must evaluate to numbers, and the result is a number.
 */
export interface BinaryArithmeticOp {
  type: 'BinaryArithmeticOp';
  /** The arithmetic operator. */
  op: '+' | '-';
  /** The left-hand sub-expression. */
  left: ExprNode;
  /** The right-hand sub-expression. */
  right: ExprNode;
}

/**
 * A short-circuiting logical binary operation.
 *
 * `&&` returns the left operand if it is falsy, otherwise the right operand.
 * `||` returns the left operand if it is truthy, otherwise the right operand.
 * Both operands must evaluate to booleans.
 */
export interface LogicalBinaryOp {
  type: 'LogicalBinaryOp';
  /** The logical operator: `&&` (and) or `||` (or). */
  op: '&&' | '||';
  /** The left-hand sub-expression, evaluated first. */
  left: ExprNode;
  /** The right-hand sub-expression, evaluated only if short-circuit permits. */
  right: ExprNode;
}

/**
 * A comparison between two sub-expressions.
 *
 * Equality (`==`, `!=`) supports any two values of the same type.
 * Relational operators (`>`, `<`, `>=`, `<=`) require both operands
 * to evaluate to numbers.
 */
export interface Comparison {
  type: 'Comparison';
  /** The comparison operator. */
  op: '==' | '!=' | '>' | '<' | '>=' | '<=';
  /** The left-hand sub-expression. */
  left: ExprNode;
  /** The right-hand sub-expression. */
  right: ExprNode;
}
