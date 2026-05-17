import React from "react";

export interface SkipOptions {
  /** 仅更新属性，不重新挂载组件 */
  onlyAttribute?: boolean;
}

/** Provider 内部状态 */
export interface ScreenState {
  component: React.ComponentType<any>;
  params: Record<string, unknown>;
  counter: number;
}

/** skip action */
export interface SkipAction {
  type: "skip";
  component: React.ComponentType<any>;
  params: Record<string, unknown>;
  onlyAttribute: boolean;
}

/** skip 函数的类型签名 */
export type SkipFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions,
) => void;
