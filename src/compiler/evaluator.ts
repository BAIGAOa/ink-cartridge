import type { ExprNode } from './ExprNode.js';
import type { VarBinding } from './types.js';

/**
 * Evaluate an AST node against the current variable bindings.
 *
 * Calls each variable's getter at evaluation time, so the result
 * always reflects the latest state.
 *
 * Short-circuit evaluation is applied for `&&` and `||`.
 *
 * @param ast  - The root AST node to evaluate.
 * @param vars - The user-declared variable bindings.
 * @returns The boolean result of the expression.
 */
export function evaluate(ast: ExprNode, vars: VarBinding[]): boolean {
  const ev = new Evaluator(vars);
  return ev.eval(ast);
}

class Evaluator {
  constructor(private vars: VarBinding[]) {}

  eval(node: ExprNode): boolean {
    const value = this.evalValue(node);
    // The type checker guarantees the top-level result is boolean.
    return value as boolean;
  }

  private evalValue(node: ExprNode): unknown {
    switch (node.type) {
      case 'BooleanLiteral':
        return node.value;
      case 'StringLiteral':
        return node.value;
      case 'NumberLiteral':
        return node.value;
      case 'Identifier':
        return this.lookup(node.name);
      case 'UnaryOp':
        return !this.evalValue(node.operand);
      case 'LogicalBinaryOp': {
        const left = this.evalValue(node.left);
        if (node.op === '&&') {
          // Short-circuit: if left is falsy, skip right
          return left && this.evalValue(node.right);
        }
        // Short-circuit: if left is truthy, skip right
        return left || this.evalValue(node.right);
      }
      case 'Comparison': {
        const left = this.evalValue(node.left);
        const right = this.evalValue(node.right);
        switch (node.op) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return (left as number) > (right as number);
          case '<': return (left as number) < (right as number);
          case '>=': return (left as number) >= (right as number);
          case '<=': return (left as number) <= (right as number);
        }
      }
    }
  }

  private lookup(name: string): unknown {
    const binding = this.vars.find(v => v.name === name);
    if (!binding) {
      throw new Error(`[ink-router-kit] Undefined variable '${name}' at runtime`);
    }
    return binding.getter();
  }
}
