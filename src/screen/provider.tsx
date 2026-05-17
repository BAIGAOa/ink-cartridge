import React, { useReducer, useMemo, useEffect, ReactNode } from 'react';
import { ScreenSystemContext } from './context.js';
import { ScreenState, SkipAction, SkipOptions } from './types.js';
import { getTemplate, hasComponent } from './registry.js';


let _dispatch: React.Dispatch<SkipAction> | null = null;

/**
 * 模块级 skip —— 可在 .ts 文件中直接调用
 * 
 * 必须在 <ScenarioManagementProvider> 挂载后使用
 */
export function skip<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions,
): void {
  if (!_dispatch) {
    throw new Error(
      '[Ink-Component] skip() 调用时 Provider 尚未挂载。请确保 <ScenarioManagementProvider> 已挂载到组件树。',
    );
  }
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Component] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }
  _dispatch({
    type: 'skip',
    component,
    params: params as Record<string, unknown>,
    onlyAttribute: options?.onlyAttribute ?? false,
  });
}


function screenReducer(state: ScreenState, action: SkipAction): ScreenState {
  const sameComponent = state.component === action.component;
  // 同组件 + onlyAttribute → 保持 key，不 remount
  // 否则 → 新 key，强制 remount
  const counter = sameComponent && action.onlyAttribute
    ? state.counter
    : state.counter + 1;

  return {
    component: action.component,
    params: action.params,
    counter,
  };
}


export interface ScenarioManagementProviderProps {
  children: ReactNode;
  /** 默认屏幕组件（必填，需先 registerComponent） */
  defaultScreen: React.ComponentType<any>;
  /** 默认参数（可选，未传则使用注册时的模板参数） */
  defaultParams?: Record<string, unknown>;
}

export function ScenarioManagementProvider({
  children,
  defaultScreen,
  defaultParams,
}: ScenarioManagementProviderProps) {
  // 校验：必须已注册
  if (!hasComponent(defaultScreen)) {
    throw new Error(
      `[Ink-Component] defaultScreen "${defaultScreen.displayName || defaultScreen.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }

  const initialParams = defaultParams ?? getTemplate(defaultScreen) ?? {};

  const [state, dispatch] = useReducer(screenReducer, {
    component: defaultScreen,
    params: initialParams,
    counter: 0,
  });

  // 注入模块级 dispatch
  useEffect(() => {
    _dispatch = dispatch;
    return () => {
      _dispatch = null;
    };
  }, []);

  // 渲染当前屏幕
  const currentScreen = useMemo(
    () =>
      React.createElement(state.component, {
        ...state.params,
        key: state.counter,
      }),
    [state.component, state.params, state.counter],
  );

  // Context 内的 skip（与模块级 skip 行为一致，复用 dispatch）
  const skipInContext: typeof skip = useMemo(
    () => (component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Component] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
        );
      }
      dispatch({
        type: 'skip',
        component,
        params: params as Record<string, unknown>,
        onlyAttribute: options?.onlyAttribute ?? false,
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ currentScreen, skip: skipInContext }),
    [currentScreen, skipInContext],
  );

  return (
    <ScreenSystemContext.Provider value={value}>
      {children}
    </ScreenSystemContext.Provider>
  );
}

export { screenReducer };
