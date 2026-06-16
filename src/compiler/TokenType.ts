/**
 * Token types produced by the lexer during the first pass of compilation.
 *
 * Each kind of source fragment — keywords, operators, literals, identifiers —
 * maps to a distinct token type so the parser can decide what to do next
 * without re-examining the raw characters.
 */
export type TokenType =
  | 'IDENT'
  /** Boolean literal `true`. */
  | 'TRUE'
  /** Boolean literal `false`. */
  | 'FALSE'
  /** String literal, delimited by single or double quotes. */
  | 'STRING'
  /** Numeric literal, integer or decimal. */
  | 'NUMBER'
  /** Logical AND operator `&&`. */
  | 'AND'
  /** Logical OR operator `||`. */
  | 'OR'
  /** Logical NOT / negation operator `!`. */
  | 'NOT'
  /** Equality comparison `==`. */
  | 'EQ'
  /** Inequality comparison `!=`. */
  | 'NEQ'
  /** Greater-than comparison `>`. */
  | 'GT'
  /** Less-than comparison `<`. */
  | 'LT'
  /** Greater-than-or-equal comparison `>=`. */
  | 'GTE'
  /** Less-than-or-equal comparison `<=`. */
  | 'LTE'
  /** Left parenthesis `(` for grouping. */
  | 'LPAREN'
  /** Right parenthesis `)` for grouping. */
  | 'RPAREN'
  /** End-of-input sentinel. */
  | 'EOF';

/** Represents the type of a value an expression evaluates to at runtime. */
export type ValueType = 'boolean' | 'string' | 'number';

/**
 * A single token emitted by the lexer.
 *
 * Each token records its {@link TokenType}, the original source text
 * (`lexeme`), and its byte offset in the source string (`position`)
 * so that error messages can point back to the exact location in the
 * original expression.
 */
export interface Token {
  type: TokenType;
  /** The raw source text that produced this token. */
  lexeme: string;
  /** Byte offset into the original source string (0-based). */
  position: number;
}
