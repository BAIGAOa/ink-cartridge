import { createContext, ReactNode } from 'react';
import type {
  SkipFn,
  BackFn,
  GotoScreenFn,
  OpenOverlayFn,
  CloseOverlayFn,
  CloseAllOverlaysFn,
  ActivateOverlayFn,
  DeactivateOverlayFn,
  OverlayEntry,
} from './types.js';

export interface ScreenSystemContextValue {
  /** 当前屏幕的已渲染元素（栈顶组件） */
  currentScreen: ReactNode;
  /** 所有浮层的已渲染元素（按 zIndex 升序） */
  currentOverlays: ReactNode[];
  /** 当前激活路径：从根到栈顶的组件数组 */
  currentPath: React.ComponentType<any>[];
  /** 沿树向下跳转（选分支） */
  skip: SkipFn;
  /** 沿树向上返回父节点 */
  back: BackFn;
  /** 跨分支跳转到任意已注册节点 */
  gotoScreen: GotoScreenFn;
  /** 打开浮层 */
  openOverlay: OpenOverlayFn;
  /** 关闭指定浮层 */
  closeOverlay: CloseOverlayFn;
  /** 关闭所有浮层 */
  closeAllOverlays: CloseAllOverlaysFn;
  /** 激活指定浮层 */
  activateOverlay: ActivateOverlayFn;
  /** 停用指定浮层 */
  deactivateOverlay: DeactivateOverlayFn;
  /** 当前激活的浮层 ID 列表 */
  activeOverlayIds: string[];
  /** 当前显示的浮层列表（只读） */
  displayedOverlays: OverlayEntry[];
}

export const ScreenSystemContext =
  createContext<ScreenSystemContextValue | null>(null);
