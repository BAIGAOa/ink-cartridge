import React, { useReducer, useMemo, useEffect, ReactNode } from 'react';
import { ScreenSystemContext } from './context.js';
import {
  ScreenState,
  ScreenAction,
  SkipOptions,
  SkipFn,
  BackFn,
  GotoScreenFn,
  OverlayFn,
  CloseOverlayFn,
} from './types.js';
import {
  getTemplate,
  hasComponent,
  isChildOf,
  getParent,
} from './registry.js';



let _dispatch: React.Dispatch<ScreenAction> | null = null;

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
      '[Ink-Trc] skip() 调用时 Provider 尚未挂载。请确保 <ScenarioManagementProvider> 已挂载到组件树。',
    );
  }
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }
  // 模块级 skip 不做编译时树校验，运行时 reducer 中校验
  _dispatch({
    type: 'skip',
    component,
    params: params as Record<string, unknown>,
    onlyAttribute: options?.onlyAttribute ?? false,
  });
}

/** 模块级 back */
export function back(): void {
  if (!_dispatch) {
    throw new Error(
      '[Ink-Trc] back() 调用时 Provider 尚未挂载。',
    );
  }
  _dispatch({ type: 'back' });
}

/** 模块级 gotoScreen */
export function gotoScreen<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
): void {
  if (!_dispatch) {
    throw new Error(
      '[Ink-Trc] gotoScreen() 调用时 Provider 尚未挂载。',
    );
  }
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }
  _dispatch({
    type: 'gotoScreen',
    component,
    params: params as Record<string, unknown>,
  });
}

/** 模块级 overlay */
export function overlay<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
): void {
  if (!_dispatch) {
    throw new Error(
      '[Ink-Trc] overlay() 调用时 Provider 尚未挂载。',
    );
  }
  if (!hasComponent(component)) {
    throw new Error(
      `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }
  _dispatch({
    type: 'overlay',
    component,
    params: params as Record<string, unknown>,
  });
}

/** 模块级 closeOverlay */
export function closeOverlay(): void {
  if (!_dispatch) {
    throw new Error(
      '[Ink-Trc] closeOverlay() 调用时 Provider 尚未挂载。',
    );
  }
  _dispatch({ type: 'closeOverlay' });
}



/**
 * 从树中查找共同祖先
 * 从 currentPath 栈底向上找到第一个在 targetAncestors 中的节点
 */
function findCommonAncestor(
  currentPath: React.ComponentType<any>[],
  target: React.ComponentType<any>,
): React.ComponentType<any> {
  // 收集目标及其所有祖先
  const targetAncestors = new Set<React.ComponentType<any>>();
  let node: React.ComponentType<any> | null | undefined = target;
  while (node) {
    targetAncestors.add(node);
    node = getParent(node);
  }

  // 从 path 底部向上查找第一个共同祖先
  for (let i = currentPath.length - 1; i >= 0; i--) {
    if (targetAncestors.has(currentPath[i])) {
      return currentPath[i];
    }
  }

  throw new Error(
    `[Ink-Trc] 无法找到共同祖先。目标组件可能不在同一棵树中。`,
  );
}

/**
 * 构建从祖先到目标节点的路径（不含祖先本身）
 */
function buildPathFrom(
  ancestor: React.ComponentType<any>,
  target: React.ComponentType<any>,
): React.ComponentType<any>[] {
  const path: React.ComponentType<any>[] = [];
  let node: React.ComponentType<any> | null | undefined = target;
  while (node && node !== ancestor) {
    path.push(node);
    node = getParent(node);
  }
  if (!node) {
    throw new Error(
      `[Ink-Trc] 目标组件不是祖先的后代。`,
    );
  }
  // 现在 path 是 [target, ..., ancestor.child]，反转得到 [ancestor.child, ..., target]
  path.reverse();
  return path;
}

function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {

    case 'skip': {
      const current = state.path[state.path.length - 1];

      // 校验：目标组件必须是当前节点的子节点
      if (!isChildOf(action.component, current)) {
        throw new Error(
          `[Ink-Trc] "${action.component.displayName || action.component.name || 'anonymous'}" 不是 "${current.displayName || current.name || 'anonymous'}" 的子节点。请用 skip 沿树向下导航，或用 gotoScreen 跨分支跳转。`,
        );
      }

      const sameComponent = action.component === current;
      const counter = sameComponent && action.onlyAttribute
        ? state.counter
        : state.counter + 1;

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      return {
        path: [...state.path, action.component],
        pathParams: [...state.pathParams, mergedParams],
        overlay: null,
        counter,
      };
    }

    case 'back': {
      if (state.path.length <= 1) {
        throw new Error(
          '[Ink-Trc] back() 失败：已在根节点，无法继续返回。',
        );
      }

      return {
        path: state.path.slice(0, -1),
        pathParams: state.pathParams.slice(0, -1),
        overlay: null,
        counter: state.counter + 1,
      };
    }

    case 'gotoScreen': {
      const commonAncestor = findCommonAncestor(state.path, action.component);
      const ancestorIndex = state.path.indexOf(commonAncestor);

      if (ancestorIndex === -1) {
        throw new Error(
          `[Ink-Trc] gotoScreen 失败：无法定位共同祖先。`,
        );
      }

      const suffix = buildPathFrom(commonAncestor, action.component);
      const newPath = [
        ...state.path.slice(0, ancestorIndex + 1),
        ...suffix,
      ];

      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      // 为新路径的每个新节点生成参数（使用模板兜底）
      const newPathParams = [
        ...state.pathParams.slice(0, ancestorIndex + 1),
        ...suffix.map((comp) => {
          const tpl = getTemplate(comp) ?? {};
          return comp === action.component ? mergedParams : tpl;
        }),
      ];

      return {
        path: newPath,
        pathParams: newPathParams,
        overlay: null,
        counter: state.counter + 1,
      };
    }

    case 'overlay': {
      const template = getTemplate(action.component) ?? {};
      const mergedParams = { ...template, ...action.params };

      return {
        ...state,
        overlay: {
          component: action.component,
          params: mergedParams,
        },
        counter: state.counter + 1,
      };
    }

    case 'closeOverlay': {
      return {
        ...state,
        overlay: null,
        counter: state.counter + 1,
      };
    }

    default:
      return state;
  }
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
  if (!hasComponent(defaultScreen)) {
    throw new Error(
      `[Ink-Trc] defaultScreen "${defaultScreen.displayName || defaultScreen.name || 'anonymous'}" 未注册。请先调用 registerComponent()。`,
    );
  }

  const initialParams =
    defaultParams ?? getTemplate(defaultScreen) ?? {};

  const [state, dispatch] = useReducer(screenReducer, {
    path: [defaultScreen],
    pathParams: [initialParams],
    overlay: null,
    counter: 0,
  });

  // 注入模块级 dispatch
  useEffect(() => {
    _dispatch = dispatch;
    return () => {
      _dispatch = null;
    };
  }, []);

  // 当前栈顶组件 & 参数
  const topComponent = state.path[state.path.length - 1];
  const topParams = state.pathParams[state.pathParams.length - 1];

  // 渲染当前屏幕元素
  const currentScreen = useMemo(
    () =>
      React.createElement(topComponent, {
        ...topParams,
        key: state.counter,
      }),
    [topComponent, topParams, state.counter],
  );

  // 渲染 overlay 元素
  const currentOverlay = useMemo(
    () =>
      state.overlay
        ? React.createElement(state.overlay.component, {
            ...state.overlay.params,
            key: `overlay-${state.counter}`,
          })
        : null,
    [state.overlay, state.counter],
  );

  // Context 内的导航方法
  const skipInContext: SkipFn = useMemo(
    () => (component, params, options) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。`,
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

  const backInContext: BackFn = useMemo(
    () => () => dispatch({ type: 'back' }),
    [],
  );

  const gotoScreenInContext: GotoScreenFn = useMemo(
    () => (component, params) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。`,
        );
      }
      dispatch({
        type: 'gotoScreen',
        component,
        params: params as Record<string, unknown>,
      });
    },
    [],
  );

  const overlayInContext: OverlayFn = useMemo(
    () => (component, params) => {
      if (!hasComponent(component)) {
        throw new Error(
          `[Ink-Trc] 组件 "${component.displayName || component.name || 'anonymous'}" 未注册。`,
        );
      }
      dispatch({
        type: 'overlay',
        component,
        params: params as Record<string, unknown>,
      });
    },
    [],
  );

  const closeOverlayInContext: CloseOverlayFn = useMemo(
    () => () => dispatch({ type: 'closeOverlay' }),
    [],
  );

  const value = useMemo(
    () => ({
      currentScreen,
      currentOverlay,
      currentPath: state.path,
      skip: skipInContext,
      back: backInContext,
      gotoScreen: gotoScreenInContext,
      overlay: overlayInContext,
      closeOverlay: closeOverlayInContext,
    }),
    [
      currentScreen,
      currentOverlay,
      state.path,
      skipInContext,
      backInContext,
      gotoScreenInContext,
      overlayInContext,
      closeOverlayInContext,
    ],
  );

  return (
    <ScreenSystemContext.Provider value={value}>
      {children}
    </ScreenSystemContext.Provider>
  );
}