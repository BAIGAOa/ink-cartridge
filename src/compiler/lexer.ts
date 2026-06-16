import type { Token } from './TokenType.js';

/**
 * Convert a DSL source string into a sequence of tokens.
 *
 * This is the first pass of the compiler pipeline. It scans the source
 * left-to-right and groups characters into the token types defined in
 * {@link TokenType}.
 *
 * @param source - The raw DSL expression string.
 * @returns An array of tokens ending with an `EOF` sentinel.
 * @throws {WhenCompileError} If an unrecognized character sequence is encountered.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < source.length) {
    const ch = source[pos];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pos++;
      continue;
    }

    // Boolean and identifier keywords
    if (isAlpha(ch)) {
      const start = pos;
      while (pos < source.length && isAlphaNum(source[pos])) {
        pos++;
      }
      const lexeme = source.slice(start, pos);
      switch (lexeme) {
        case 'true':
          tokens.push({ type: 'TRUE', lexeme, position: start });
          break;
        case 'false':
          tokens.push({ type: 'FALSE', lexeme, position: start });
          break;
        default:
          tokens.push({ type: 'IDENT', lexeme, position: start });
          break;
      }
      continue;
    }

    // Numbers
    if (isDigit(ch)) {
      const start = pos;
      while (pos < source.length && isDigit(source[pos])) {
        pos++;
      }
      // Optional fractional part
      if (pos < source.length && source[pos] === '.') {
        pos++;
        while (pos < source.length && isDigit(source[pos])) {
          pos++;
        }
      }
      tokens.push({ type: 'NUMBER', lexeme: source.slice(start, pos), position: start });
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = pos;
      pos++; // skip opening quote
      while (pos < source.length && source[pos] !== quote) {
        pos++;
      }
      if (pos >= source.length) {
        throw new Error(`[ink-router-kit] Unterminated string literal at position ${start}`);
      }
      pos++; // skip closing quote
      tokens.push({ type: 'STRING', lexeme: source.slice(start, pos), position: start });
      continue;
    }

    // Operators and punctuation
    switch (ch) {
      case '&':
        if (source[pos + 1] === '&') {
          tokens.push({ type: 'AND', lexeme: '&&', position: pos });
          pos += 2;
          continue;
        }
        throw new Error(`[ink-router-kit] Unexpected character '&' at position ${pos}. Did you mean '&&'?`);
      case '|':
        if (source[pos + 1] === '|') {
          tokens.push({ type: 'OR', lexeme: '||', position: pos });
          pos += 2;
          continue;
        }
        throw new Error(`[ink-router-kit] Unexpected character '|' at position ${pos}. Did you mean '||'?`);
      case '!':
        if (source[pos + 1] === '=') {
          tokens.push({ type: 'NEQ', lexeme: '!=', position: pos });
          pos += 2;
        } else {
          tokens.push({ type: 'NOT', lexeme: '!', position: pos });
          pos++;
        }
        continue;
      case '=':
        if (source[pos + 1] === '=') {
          tokens.push({ type: 'EQ', lexeme: '==', position: pos });
          pos += 2;
        } else {
          throw new Error(`[ink-router-kit] Unexpected character '=' at position ${pos}. Did you mean '=='?`);
        }
        continue;
      case '>':
        if (source[pos + 1] === '=') {
          tokens.push({ type: 'GTE', lexeme: '>=', position: pos });
          pos += 2;
        } else {
          tokens.push({ type: 'GT', lexeme: '>', position: pos });
          pos++;
        }
        continue;
      case '<':
        if (source[pos + 1] === '=') {
          tokens.push({ type: 'LTE', lexeme: '<=', position: pos });
          pos += 2;
        } else {
          tokens.push({ type: 'LT', lexeme: '<', position: pos });
          pos++;
        }
        continue;
      case '+':
        tokens.push({ type: 'PLUS', lexeme: '+', position: pos });
        pos++;
        continue;
      case '-':
        tokens.push({ type: 'MINUS', lexeme: '-', position: pos });
        pos++;
        continue;
      case '(':
        tokens.push({ type: 'LPAREN', lexeme: '(', position: pos });
        pos++;
        continue;
      case ')':
        tokens.push({ type: 'RPAREN', lexeme: ')', position: pos });
        pos++;
        continue;
      default:
        throw new Error(`[ink-router-kit] Unexpected character '${ch}' at position ${pos}`);
    }
  }

  tokens.push({ type: 'EOF', lexeme: '', position: source.length });
  return tokens;
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}
