import { describe, it, expect } from 'vitest';
import { createContext } from '../../compiler/context.js';

describe('WhenCompiler', () => {
  describe('boolean literals', () => {
    it('compile("true") returns a function that returns true', () => {
      const ctx = createContext();
      const when = ctx.compile('true');
      expect(when()).toBe(true);
    });

    it('compile("false") returns a function that returns false', () => {
      const ctx = createContext();
      const when = ctx.compile('false');
      expect(when()).toBe(false);
    });
  });

  describe('variable references', () => {
    it('resolves a boolean variable', () => {
      let flag = true;
      const when = createContext()
        .varBool('flag', () => flag)
        .compile('flag');
      expect(when()).toBe(true);
      flag = false;
      expect(when()).toBe(false);
    });

    it('resolves a string variable', () => {
      const when = createContext()
        .varStr('mode', () => 'insert')
        .compile('mode == "insert"');
      expect(when()).toBe(true);
    });

    it('resolves a numeric variable', () => {
      const when = createContext()
        .varNum('count', () => 5)
        .compile('count > 3');
      expect(when()).toBe(true);
    });

    it('throws at compile time for undefined variable', () => {
      const ctx = createContext();
      expect(() => ctx.compile('unknown')).toThrow(/Undefined variable/);
    });

    it('re-evaluates getters on each invocation', () => {
      let count = 0;
      const when = createContext()
        .varNum('n', () => count)
        .compile('n == 0');
      expect(when()).toBe(true);
      count = 1;
      expect(when()).toBe(false);
    });
  });

  describe('logical NOT', () => {
    it('negates a boolean variable', () => {
      let flag = false;
      const when = createContext()
        .varBool('flag', () => flag)
        .compile('!flag');
      expect(when()).toBe(true);
      flag = true;
      expect(when()).toBe(false);
    });

    it('negates a boolean literal', () => {
      const when = createContext().compile('!false');
      expect(when()).toBe(true);
    });

    it('double negation', () => {
      const when = createContext()
        .varBool('x', () => true)
        .compile('!!x');
      expect(when()).toBe(true);
    });

    it('throws at compile time when operand is not boolean', () => {
      const ctx = createContext().varNum('n', () => 1);
      expect(() => ctx.compile('!n')).toThrow(/boolean/);
    });
  });

  describe('comparisons', () => {
    describe('equality (==, !=)', () => {
      it('compares equal strings', () => {
        const when = createContext()
          .varStr('s', () => 'hello')
          .compile('s == "hello"');
        expect(when()).toBe(true);
      });

      it('compares unequal strings', () => {
        const when = createContext()
          .varStr('s', () => 'hello')
          .compile('s != "world"');
        expect(when()).toBe(true);
      });

      it('compares equal booleans', () => {
        const when = createContext()
          .varBool('b', () => true)
          .compile('b == true');
        expect(when()).toBe(true);
      });

      it('throws on cross-type equality (string vs number)', () => {
        const ctx = createContext()
          .varStr('s', () => '5');
        expect(() => ctx.compile('s == 5')).toThrow(/same type/);
      });

      it('compares equal numbers', () => {
        const when = createContext()
          .varNum('n', () => 42)
          .compile('n == 42');
        expect(when()).toBe(true);
      });
    });

    describe('relational (>, <, >=, <=)', () => {
      it('greater-than with numbers', () => {
        const when = createContext()
          .varNum('n', () => 10)
          .compile('n > 5');
        expect(when()).toBe(true);
      });

      it('less-than with numbers', () => {
        const when = createContext()
          .varNum('n', () => 3)
          .compile('n < 5');
        expect(when()).toBe(true);
      });

      it('greater-than-or-equal with numbers', () => {
        const when = createContext()
          .varNum('n', () => 5)
          .compile('n >= 5');
        expect(when()).toBe(true);
      });

      it('less-than-or-equal with numbers', () => {
        const when = createContext()
          .varNum('n', () => 5)
          .compile('n <= 5');
        expect(when()).toBe(true);
      });

      it('decimal number literal', () => {
        const when = createContext()
          .varNum('n', () => 3.14)
          .compile('n > 3.0');
        expect(when()).toBe(true);
      });

      it('throws when relational operator used on non-number (left)', () => {
        const ctx = createContext().varStr('s', () => 'a');
        expect(() => ctx.compile('s > 1')).toThrow(/number/);
      });

      it('throws when relational operator used on non-number (right)', () => {
        const ctx = createContext().varNum('n', () => 1);
        expect(() => ctx.compile('n > "a"')).toThrow(/number/);
      });
    });
  });

  describe('logical AND (&&)', () => {
    it('returns true when both operands are true', () => {
      const when = createContext()
        .varBool('a', () => true)
        .varBool('b', () => true)
        .compile('a && b');
      expect(when()).toBe(true);
    });

    it('returns false when left is false', () => {
      const when = createContext()
        .varBool('a', () => false)
        .varBool('b', () => true)
        .compile('a && b');
      expect(when()).toBe(false);
    });

    it('short-circuits: does not evaluate right when left is false', () => {
      let rightCalled = false;
      const when = createContext()
        .varBool('a', () => false)
        .varBool('b', () => { rightCalled = true; return true; })
        .compile('a && b');
      when();
      expect(rightCalled).toBe(false);
    });

    it('throws when left operand is not boolean', () => {
      const ctx = createContext().varNum('n', () => 1);
      expect(() => ctx.compile('n && true')).toThrow(/boolean/);
    });
  });

  describe('logical OR (||)', () => {
    it('returns true when left is true', () => {
      const when = createContext()
        .varBool('a', () => true)
        .varBool('b', () => false)
        .compile('a || b');
      expect(when()).toBe(true);
    });

    it('returns false when both operands are false', () => {
      const when = createContext()
        .varBool('a', () => false)
        .varBool('b', () => false)
        .compile('a || b');
      expect(when()).toBe(false);
    });

    it('short-circuits: does not evaluate right when left is true', () => {
      let rightCalled = false;
      const when = createContext()
        .varBool('a', () => true)
        .varBool('b', () => { rightCalled = true; return false; })
        .compile('a || b');
      when();
      expect(rightCalled).toBe(false);
    });

    it('throws when right operand is not boolean', () => {
      const ctx = createContext()
        .varBool('a', () => true)
        .varNum('n', () => 1);
      expect(() => ctx.compile('a || n')).toThrow(/boolean/);
    });
  });

  describe('parentheses', () => {
    it('overrides default precedence: AND before OR', () => {
      // Without parens: true && false || true → (true && false) || true → false || true → true
      // With parens:   true && (false || true) → true && true → true
      // Use a case where the difference matters:
      // true || true && false → without parens: true || (true && false) → true || false → true
      // (true || true) && false → with parens: true && false → false
      const when = createContext()
        .varBool('a', () => true)
        .varBool('b', () => true)
        .varBool('c', () => false)
        .compile('(a || b) && c');
      expect(when()).toBe(false);
    });

    it('nested parentheses', () => {
      // ((true && true) || false) → (true || false) → true
      const when = createContext().compile('((true && true) || false)');
      expect(when()).toBe(true);
    });

    it('parentheses around comparison', () => {
      const when = createContext()
        .varNum('n', () => 10)
        .compile('(n > 5) && true');
      expect(when()).toBe(true);
    });

    it('throws on unmatched opening parenthesis', () => {
      const ctx = createContext();
      expect(() => ctx.compile('(true && false')).toThrow(/Expected RPAREN/);
    });

    it('throws on unmatched closing parenthesis', () => {
      const ctx = createContext();
      expect(() => ctx.compile('true && false)')).toThrow(/Expected EOF/);
    });
  });

  describe('error handling', () => {
    describe('syntax errors', () => {
      it('throws on unexpected character', () => {
        const ctx = createContext();
        expect(() => ctx.compile('x @ y')).toThrow(/Unexpected character/);
      });

      it('throws on single & (missing second &)', () => {
        const ctx = createContext();
        expect(() => ctx.compile('true & false')).toThrow(/Did you mean/);
      });

      it('throws on single | (missing second |)', () => {
        const ctx = createContext();
        expect(() => ctx.compile('true | false')).toThrow(/Did you mean/);
      });

      it('throws on single = (missing second =)', () => {
        const ctx = createContext();
        expect(() => ctx.compile('a = b')).toThrow(/Did you mean/);
      });

      it('throws on unterminated string literal', () => {
        const ctx = createContext();
        expect(() => ctx.compile('"hello')).toThrow(/Unterminated string/);
      });

      it('throws on empty input', () => {
        const ctx = createContext();
        expect(() => ctx.compile('')).toThrow();
      });
    });

    describe('type errors', () => {
      it('throws when && operands are not both boolean', () => {
        const ctx = createContext()
          .varNum('n', () => 1)
          .varNum('m', () => 2);
        expect(() => ctx.compile('n && m')).toThrow(/boolean/);
      });

      it('throws when comparing string with relational operator', () => {
        const ctx = createContext()
          .varStr('a', () => 'x')
          .varStr('b', () => 'y');
        expect(() => ctx.compile('a > b')).toThrow(/number/);
      });

      it('throws when comparing boolean with number', () => {
        const ctx = createContext()
          .varBool('b', () => true);
        expect(() => ctx.compile('b == 1')).toThrow(/same type/);
      });
    });

    describe('duplicate variable names', () => {
      it('first declaration wins when name is re-declared', () => {
        let first = true;
        let second = false;
        const when = createContext()
          .varBool('x', () => first)
          .varBool('x', () => second)
          .compile('x');
        expect(when()).toBe(true);
      });
    });

    describe('complex expressions', () => {
      it('combines AND, OR, NOT, and comparisons', () => {
        let editing = true;
        let count = 10;
        const when = createContext()
          .varBool('editing', () => editing)
          .varNum('count', () => count)
          .compile('editing && count > 0 && count <= 100');
        expect(when()).toBe(true);
        count = 0;
        expect(when()).toBe(false);
      });

      it('expression with all variable types', () => {
        let flag = true;
        let mode = 'insert';
        let count = 5;
        const when = createContext()
          .varBool('flag', () => flag)
          .varStr('mode', () => mode)
          .varNum('count', () => count)
          .compile('flag && mode == "insert" && count >= 1');
        expect(when()).toBe(true);
      });

      it('reusable context: compiles multiple expressions from the same vars', () => {
        let count = 5;
        const ctx = createContext().varNum('count', () => count);

        const gt = ctx.compile('count > 3');
        const lt = ctx.compile('count < 3');

        expect(gt()).toBe(true);
        expect(lt()).toBe(false);
      });
    });

    describe('unary minus (arithmetic negation)', () => {
      it('negates a positive integer literal', () => {
        const when = createContext()
          .varNum('n', () => 5)
          .compile('n == 5 && n > -1');
        expect(when()).toBe(true);
      });

      it('negates a decimal literal', () => {
        const when = createContext()
          .varNum('n', () => -3.14)
          .compile('n == -3.14');
        expect(when()).toBe(true);
      });

      it('double negation returns the original value', () => {
        const when = createContext()
          .varNum('n', () => 5)
          .compile('--n == 5');
        expect(when()).toBe(true);
      });

      it('triple negation is equivalent to single negation', () => {
        // ---5 → -(-(-5)) → -(5) → -5
        const when = createContext()
          .varNum('n', () => 5)
          .compile('---n == -5');
        expect(when()).toBe(true);
      });

      it('negates a variable', () => {
        let val = 7;
        const when = createContext()
          .varNum('n', () => val)
          .compile('-n == -7');
        expect(when()).toBe(true);
        val = -3;
        expect(when()).toBe(false); // -(-3) == 3, not -7
      });

      it('negates a parenthesised expression', () => {
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 2)
          .compile('-(a + b) == -5');
        expect(when()).toBe(true);
      });

      it('negates zero', () => {
        const when = createContext().compile('-0 == 0');
        expect(when()).toBe(true);
      });

      it('negation combined with comparison', () => {
        let count = 0;
        const when = createContext()
          .varNum('n', () => count)
          .compile('-n >= 0');
        expect(when()).toBe(true);
        count = 1;
        expect(when()).toBe(false);
      });

      it('throws when unary minus operand is not a number', () => {
        const ctx = createContext().varBool('b', () => true);
        expect(() => ctx.compile('-b')).toThrow(/number/);
      });

      it('throws when unary minus on string variable', () => {
        const ctx = createContext().varStr('s', () => 'a');
        expect(() => ctx.compile('-s')).toThrow(/number/);
      });
    });

    describe('binary addition and subtraction', () => {
      it('adds two numbers', () => {
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 4)
          .compile('a + b == 7');
        expect(when()).toBe(true);
      });

      it('subtracts two numbers', () => {
        const when = createContext()
          .varNum('a', () => 10)
          .varNum('b', () => 3)
          .compile('a - b == 7');
        expect(when()).toBe(true);
      });

      it('subtraction resulting in negative', () => {
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 10)
          .compile('a - b == -7');
        expect(when()).toBe(true);
      });

      it('subtraction resulting in zero', () => {
        const when = createContext()
          .varNum('a', () => 5)
          .varNum('b', () => 5)
          .compile('a - b == 0');
        expect(when()).toBe(true);
      });

      it('adding a negative number', () => {
        const when = createContext()
          .varNum('n', () => 5)
          .compile('n + -3 == 2');
        expect(when()).toBe(true);
      });

      it('subtracting a negative number (double negative)', () => {
        // n - -3 == n + 3
        const when = createContext()
          .varNum('n', () => 5)
          .compile('n - -3 == 8');
        expect(when()).toBe(true);
      });

      it('chained addition and subtraction (left-associative)', () => {
        // 10 - 3 + 2 - 1 → ((10-3)+2)-1 → 8
        const when = createContext()
          .varNum('a', () => 10)
          .varNum('b', () => 3)
          .varNum('c', () => 2)
          .varNum('d', () => 1)
          .compile('a - b + c - d == 8');
        expect(when()).toBe(true);
      });

      it('multiple chained subtractions', () => {
        // 100 - 10 - 58 - 1 → 31
        const when = createContext().compile('100 - 10 - 58 - 1 == 31');
        expect(when()).toBe(true);
      });

      it('adding zero does not change value', () => {
        const when = createContext()
          .varNum('n', () => 42)
          .compile('n + 0 == 42');
        expect(when()).toBe(true);
      });

      it('subtracting zero does not change value', () => {
        const when = createContext()
          .varNum('n', () => 42)
          .compile('n - 0 == 42');
        expect(when()).toBe(true);
      });

      it('re-evaluates arithmetic with changing variables', () => {
        let a = 5;
        let b = 3;
        const when = createContext()
          .varNum('a', () => a)
          .varNum('b', () => b)
          .compile('a + b > 5');
        expect(when()).toBe(true);  // 8 > 5
        a = 1;
        expect(when()).toBe(false); // 4 > 5
      });

      it('throws when left operand of + is not a number', () => {
        const ctx = createContext()
          .varBool('b', () => true)
          .varNum('n', () => 1);
        expect(() => ctx.compile('b + n')).toThrow(/number/);
      });

      it('throws when right operand of - is not a number', () => {
        const ctx = createContext()
          .varNum('n', () => 1)
          .varStr('s', () => 'a');
        expect(() => ctx.compile('n - s')).toThrow(/number/);
      });

      it('throws when adding string variables', () => {
        const ctx = createContext()
          .varStr('a', () => 'x')
          .varStr('b', () => 'y');
        expect(() => ctx.compile('a + b')).toThrow(/number/);
      });
    });

    describe('arithmetic precedence', () => {
      it('unary minus binds tighter than binary minus', () => {
        // a - -b  ≡  a - (-b), not (a -) b which is invalid
        const when = createContext()
          .varNum('a', () => 5)
          .varNum('b', () => 3)
          .compile('a - -b == 8');
        expect(when()).toBe(true);
      });

      it('arithmetic binds tighter than comparison', () => {
        // a + b > c  ≡  (a + b) > c, not a + (b > c)
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 4)
          .varNum('c', () => 2)
          .compile('a + b > c');
        expect(when()).toBe(true);
      });

      it('arithmetic binds tighter than logical AND', () => {
        // a - b < 0 && flag  ≡  ((a - b) < 0) && flag
        let flag = true;
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 10)
          .varBool('flag', () => flag)
          .compile('a - b < 0 && flag');
        expect(when()).toBe(true);
      });

      it('unary minus before addition in precedence', () => {
        // -a + b  ≡  (-a) + b, not -(a + b)
        const when = createContext()
          .varNum('a', () => 3)
          .varNum('b', () => 7)
          .compile('-a + b == 4');
        expect(when()).toBe(true);
      });

      it('comparison of two arithmetic results', () => {
        // (a + b) < (c - d)
        const when = createContext()
          .varNum('a', () => 1)
          .varNum('b', () => 2)
          .varNum('c', () => 10)
          .varNum('d', () => 3)
          .compile('a + b < c - d');
        expect(when()).toBe(true); // 3 < 7
      });
    });

    describe('parentheses with arithmetic', () => {
      it('parentheses group arithmetic before comparison', () => {
        const when = createContext().compile('(10 - 5) > 2');
        expect(when()).toBe(true);
      });

      it('parentheses override default left-associativity of subtraction', () => {
        // left-assoc: (10 - 7) - 3 = 0;  parens: 10 - (7 - 3) = 6
        let a = 10, b = 7, c = 3;
        const without = createContext()
          .varNum('a', () => a).varNum('b', () => b).varNum('c', () => c)
          .compile('a - b - c == 0');
        const withParens = createContext()
          .varNum('a', () => a).varNum('b', () => b).varNum('c', () => c)
          .compile('a - (b - c) == 6');
        expect(without()).toBe(true);
        expect(withParens()).toBe(true);
      });
    });

    describe('edge values and mixed scenarios', () => {
      it('handles large negative numbers', () => {
        const when = createContext()
          .varNum('n', () => -99999)
          .compile('n > -100000');
        expect(when()).toBe(true);
      });

      it('decimal arithmetic with all operations', () => {
        const when = createContext()
          .varNum('a', () => 3.5)
          .varNum('b', () => 1.2)
          .compile('a + b > 4.6 && a - b < 2.5');
        expect(when()).toBe(true);
      });

      it('negative decimals in chained expressions', () => {
        // -2.5 + 3.0 - 0.5 == 0.0
        const when = createContext().compile('-2.5 + 3.0 - 0.5 == 0.0');
        expect(when()).toBe(true);
      });

      it('mixing NOT with negation: !flag && -n < 0', () => {
        let flag = true;
        let n = 5;
        const when = createContext()
          .varBool('flag', () => flag)
          .varNum('n', () => n)
          .compile('!flag && -n < 0');
        expect(when()).toBe(false); // !true → false, short-circuits
      });

      it('negation inside logical context with changing variables', () => {
        let flag = false;
        let n = 3;
        const when = createContext()
          .varBool('flag', () => flag)
          .varNum('n', () => n)
          .compile('flag || -n < -1');
        expect(when()).toBe(true); // -3 < -1 → true
        n = 0;
        expect(when()).toBe(false); // -0 < -1 → false, flag is false
      });

      it('mixed arithmetic precedence: addition binds before comparison, AND before OR', () => {
        let a = 10, b = 3, flag = true;
        const when = createContext()
          .varNum('a', () => a)
          .varNum('b', () => b)
          .varBool('flag', () => flag)
          .compile('a - b > 5 && flag || b + 2 == 5');
        // (10 - 3) > 5 && true  → 7 > 5 && true → true && true → true
        expect(when()).toBe(true);
      });
    });
  });
});
