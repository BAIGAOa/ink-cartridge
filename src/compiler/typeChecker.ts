import type { ExprNode } from './ExprNode.js';
import type { VarBinding } from './types.js';
import type { ValueType } from './TokenType.js';

/**
 * Validate that an AST is type-safe given the declared variable bindings.
 *
 * Checks performed:
 * - Every `Identifier` references a declared variable.
 * - `!` operand is boolean.
 * - `&&` / `||` operands are boolean.
 * - Comparison operators match: `==` / `!=` require same-type operands;
 *   `>` / `<` / `>=` / `<=` require both operands to be number.
 *
 * @param ast  - The root AST node.
 * @param vars - The user-declared variable bindings.
 * @throws {WhenCompileError} If a type error is detected.
 */
export function typeCheck(ast: ExprNode, vars: VarBinding[]): void {
  const checker = new TypeChecker(vars);
  checker.check(ast);
}

class TypeChecker {
  constructor(private vars: VarBinding[]) {}

  /** Return the declared type of a node, or throw on type error. */
  check(node: ExprNode): ValueType {
    switch (node.type) {
      case 'BooleanLiteral':
        return 'boolean';
      case 'StringLiteral':
        return 'string';
      case 'NumberLiteral':
        return 'number';
      case 'Identifier':
        return this.checkIdentifier(node.name);
      case 'UnaryOp':
        return this.checkUnaryOp(node);
      case 'BinaryArithmeticOp':
        return this.checkBinaryArithmeticOp(node);
      case 'LogicalBinaryOp':
        return this.checkLogicalBinaryOp(node);
      case 'Comparison':
        return this.checkComparison(node);
    }
  }

  private checkIdentifier(name: string): ValueType {
    const binding = this.vars.find(v => v.name === name);
    if (!binding) {
      throw new Error(`[ink-router-kit] Undefined variable '${name}'`);
    }
    return binding.type;
  }

  private checkUnaryOp(node: { op: '!' | '-'; operand: ExprNode }): ValueType {
    const operandType = this.check(node.operand);
    if (node.op === '!') {
      if (operandType !== 'boolean') {
        throw new Error(
          `[ink-router-kit] Operator '!' requires a boolean operand, but got '${operandType}'`,
        );
      }
      return 'boolean';
    }
    // node.op === '-'
    if (operandType !== 'number') {
      throw new Error(
        `[ink-router-kit] Operator '-' requires a number operand, but got '${operandType}'`,
      );
    }
    return 'number';
  }

  private checkBinaryArithmeticOp(node: {
    op: '+' | '-';
    left: ExprNode;
    right: ExprNode;
  }): ValueType {
    const leftType = this.check(node.left);
    if (leftType !== 'number') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires number operands, ` +
        `but left side is '${leftType}'`,
      );
    }
    const rightType = this.check(node.right);
    if (rightType !== 'number') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires number operands, ` +
        `but right side is '${rightType}'`,
      );
    }
    return 'number';
  }

  private checkLogicalBinaryOp(node: {
    op: '&&' | '||';
    left: ExprNode;
    right: ExprNode;
  }): ValueType {
    const leftType = this.check(node.left);
    if (leftType !== 'boolean') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires boolean operands, ` +
        `but left side is '${leftType}'`,
      );
    }
    const rightType = this.check(node.right);
    if (rightType !== 'boolean') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires boolean operands, ` +
        `but right side is '${rightType}'`,
      );
    }
    return 'boolean';
  }

  private checkComparison(node: {
    op: '==' | '!=' | '>' | '<' | '>=' | '<=';
    left: ExprNode;
    right: ExprNode;
  }): ValueType {
    const leftType = this.check(node.left);
    const rightType = this.check(node.right);

    if (node.op === '==' || node.op === '!=') {
      if (leftType !== rightType) {
        throw new Error(
          `[ink-router-kit] Cannot compare '${leftType}' with '${rightType}' ` +
          `using '${node.op}'. Operands must have the same type.`,
        );
      }
      return 'boolean';
    }

    // Relational operators (> < >= <=)
    if (leftType !== 'number') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires number operands, ` +
        `but left side is '${leftType}'`,
      );
    }
    if (rightType !== 'number') {
      throw new Error(
        `[ink-router-kit] Operator '${node.op}' requires number operands, ` +
        `but right side is '${rightType}'`,
      );
    }
    return 'boolean';
  }
}
