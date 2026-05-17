import { createContext, ReactNode } from 'react';
import type {
  SkipFn,
  BackFn,
  GotoScreenFn,
  OverlayFn,
  CloseOverlayFn,
} from './types.js';

export interface ScreenSystemContextValue {
  /** 当前屏幕的已渲染元素（栈顶组件） */
  currentScreen: ReactNode;
  /** overlay 的已渲染元素（若有） */
  currentOverlay: ReactNode | null;
  /** 当前激活路径：从根到栈顶的组件数组 */
  currentPath: React.ComponentType<any>[];
  /** 沿树向下跳转（选分支） */
  skip: SkipFn;
  /** 沿树向上返回父节点 */
  back: BackFn;
  /** 跨分支跳转到任意已注册节点 */
  gotoScreen: GotoScreenFn;
  /** 打开浮层 */
  overlay: OverlayFn;
  /** 关闭浮层 */
  closeOverlay: CloseOverlayFn;
}

export const ScreenSystemContext =
  createContext<ScreenSystemContextValue | null>(null);