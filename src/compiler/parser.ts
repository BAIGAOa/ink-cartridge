import type { Token } from './TokenType.js';
import type { ExprNode } from './ExprNode.js';

/**
 * Parse a token sequence into an AST.
 *
 * Uses recursive descent. The grammar (in order of precedence, lowest first):
 *
 * ```
 * expression  → logicalOr
 * logicalOr   → logicalAnd ('||' logicalAnd)*
 * logicalAnd  → comparison ('&&' comparison)*
 * comparison  → unary (('==' | '!=' | '>' | '<' | '>=' | '<=') unary)?
 * unary       → '!' unary | primary
 * primary     → TRUE | FALSE | STRING | NUMBER | IDENT | '(' expression ')'
 * ```
 *
 * @param tokens - The token sequence from the lexer, ending with `EOF`.
 * @returns The root AST node.
 * @throws {WhenCompileError} If the token sequence does not match the grammar.
 */
export function parse(tokens: Token[]): ExprNode {
  const parser = new Parser(tokens);
  const node = parser.parseExpression();
  parser.expect('EOF');
  return node;
}

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  private get current(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    const token = this.current;
    this.pos++;
    return token;
  }

  expect(type: Token['type']): Token {
    if (this.current.type === type) {
      return this.advance();
    }
    throw new Error(
      `[ink-router-kit] Expected ${type} but got ${this.current.type} ` +
      `('${this.current.lexeme}') at position ${this.current.position}`,
    );
  }

  parseExpression(): ExprNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ExprNode {
    let left = this.parseLogicalAnd();
    while (this.current.type === 'OR') {
      const op = this.advance().lexeme as '||';
      const right = this.parseLogicalAnd();
      left = { type: 'LogicalBinaryOp', op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ExprNode {
    let left = this.parseComparison();
    while (this.current.type === 'AND') {
      const op = this.advance().lexeme as '&&';
      const right = this.parseComparison();
      left = { type: 'LogicalBinaryOp', op, left, right };
    }
    return left;
  }

  private parseComparison(): ExprNode {
    const left = this.parseUnary();
    const opType = this.current.type;
    if (opType === 'EQ' || opType === 'NEQ' || opType === 'GT' ||
        opType === 'LT' || opType === 'GTE' || opType === 'LTE') {
      const op = this.advance().lexeme as '==' | '!=' | '>' | '<' | '>=' | '<=';
      const right = this.parseUnary();
      return { type: 'Comparison', op, left, right };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    if (this.current.type === 'NOT') {
      const op = this.advance().lexeme as '!';
      const operand = this.parseUnary();
      return { type: 'UnaryOp', op, operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const token = this.current;

    switch (token.type) {
      case 'TRUE':
        this.advance();
        return { type: 'BooleanLiteral', valueType: 'boolean', value: true };
      case 'FALSE':
        this.advance();
        return { type: 'BooleanLiteral', valueType: 'boolean', value: false };
      case 'STRING': {
        this.advance();
        // Strip quotes and resolve basic escapes
        const raw = token.lexeme.slice(1, -1);
        const value = raw.replace(/\\(.)/g, (_, ch) => {
          switch (ch) {
            case 'n': return '\n';
            case 't': return '\t';
            case '\\': return '\\';
            default: return ch;
          }
        });
        return { type: 'StringLiteral', valueType: 'string', value };
      }
      case 'NUMBER':
        this.advance();
        return { type: 'NumberLiteral', valueType: 'number', value: Number(token.lexeme) };
      case 'IDENT':
        this.advance();
        return { type: 'Identifier', name: token.lexeme };
      case 'LPAREN': {
        this.advance();
        const expr = this.parseExpression();
        this.expect('RPAREN');
        return expr;
      }
      default:
        throw new Error(
          `[ink-router-kit] Unexpected token ${token.type} ` +
          `('${token.lexeme}') at position ${token.position}`,
        );
    }
  }
}
