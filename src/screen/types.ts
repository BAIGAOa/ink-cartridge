import React from 'react';



export interface RegisterOptions {
  /** 父节点组件，不传则为根节点候选 */
  parent?: React.ComponentType<any>;
}



export interface SkipOptions {
  /** 仅更新属性，不重新挂载组件 */
  onlyAttribute?: boolean;
}



/** Provider 内部状态 */
export interface ScreenState {
  /** 从根到当前节点的完整路径 */
  path: React.ComponentType<any>[];
  /** 路径上每层的参数 */
  pathParams: Record<string, unknown>[];
  /** 当前 overlay（独立于树） */
  overlay: {
    component: React.ComponentType<any>;
    params: Record<string, unknown>;
  } | null;
  /** 自增计数器，用于 React key */
  counter: number;
}



export type ScreenActionType = 'skip' | 'back' | 'gotoScreen' | 'overlay' | 'closeOverlay';

export interface SkipAction {
  type: 'skip';
  component: React.ComponentType<any>;
  params: Record<string, unknown>;
  onlyAttribute: boolean;
}

export interface BackAction {
  type: 'back';
}

export interface GotoScreenAction {
  type: 'gotoScreen';
  component: React.ComponentType<any>;
  params: Record<string, unknown>;
}

export interface OverlayAction {
  type: 'overlay';
  component: React.ComponentType<any>;
  params: Record<string, unknown>;
}

export interface CloseOverlayAction {
  type: 'closeOverlay';
}

export type ScreenAction =
  | SkipAction
  | BackAction
  | GotoScreenAction
  | OverlayAction
  | CloseOverlayAction;



export type SkipFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions,
) => void;

export type BackFn = () => void;

export type GotoScreenFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
) => void;

export type OverlayFn = <C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
) => void;

export type CloseOverlayFn = () => void;