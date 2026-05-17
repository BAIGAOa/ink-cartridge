import { createContext, ReactNode } from "react";
import type { SkipFn } from "./types.js";

export interface ScreenSystemContextValue {
  /** 当前屏幕的已渲染元素 */
  currentScreen: ReactNode;
  /** 跳转到指定组件 */
  skip: SkipFn;
}

export const ScreenSystemContext =
  createContext<ScreenSystemContextValue | null>(null);
