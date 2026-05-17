import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useInput, Key } from 'ink';
import { KeyboardContext } from './context.js';
import {
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyEntry,
} from './types.js';
import { useScreenSystem } from '../screen/hook.js';



/** 当前屏幕路径（由 Provider 同步更新） */
let _currentPath: React.ComponentType<any>[] = [];

/** 当前 overlay 组件类型（由 Provider 同步更新） */
let _currentOverlayComponent: React.ComponentType<any> | null = null;



/**
 * 将 Ink 的 (input, key) 转换为可匹配的按键名列表
 * 
 * 例如：按 ctrl+s → ["ctrl+s", "ctrl+shift+s"?]（取决于是否同时按了 shift）
 *       按 return → ["return"]
 *       按 Escape → ["escape"]
 * 
 * Ink 7 注意：key.meta 仅对 Alt/Meta 组合键为 true，不再对 Escape 触发。
 */
function normalizeKeyNames(input: string, key: Key): string[] {
  const names: string[] = [];

  // 特殊键（Ink 7 支持的完整列表）
  const specialMap: Array<[keyof Key, string]> = [
    ['return', 'return'],
    ['escape', 'escape'],
    ['backspace', 'backspace'],
    ['delete', 'delete'],
    ['upArrow', 'up'],
    ['downArrow', 'down'],
    ['leftArrow', 'left'],
    ['rightArrow', 'right'],
    ['tab', 'tab'],
    ['pageDown', 'pagedown'],
    ['pageUp', 'pageup'],
    ['home', 'home'],
    ['end', 'end'],
  ];

  for (const [kProp, kName] of specialMap) {
    if (key[kProp]) {
      // 基础名
      names.push(kName);
      // 带修饰符的组合名
      if (key.ctrl) names.push(`ctrl+${kName}`);
      if (key.shift) names.push(`shift+${kName}`);
      if (key.meta) names.push(`meta+${kName}`);
      return names; // 特殊键直接返回，不继续处理普通字符
    }
  }

  // 普通字符键
  if (input) {
    names.push(input);
    if (key.ctrl) names.push(`ctrl+${input}`);
    if (key.shift) names.push(`shift+${input}`);
    if (key.meta) names.push(`meta+${input}`);
    if (key.ctrl && key.shift) names.push(`ctrl+shift+${input}`);
  }

  return names;
}


export interface KeyboardProviderProps {
  children: ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const { currentPath, currentOverlay } = useScreenSystem();

  // 同步模块级变量（render 阶段，先于 children 渲染）
  _currentPath = currentPath;

  // 从 currentOverlay 元素中提取组件类型
  _currentOverlayComponent = currentOverlay
    ? (currentOverlay as React.ReactElement).type as React.ComponentType<any>
    : null;

  // 每层的绑定数据：Map<component, layer>
  const layersRef = useRef<
    Map<
      React.ComponentType<any>,
      { bindings: BoundKeyEntry[]; blockedKeys: string[] }
    >
  >(new Map());

  // 追踪上一次的路径，用于清理已离开的层
  const prevPathRef = useRef<React.ComponentType<any>[]>([]);

  // 当路径变化时，清理已离开路径的层
  useEffect(() => {
    const prev = prevPathRef.current;
    for (const comp of prev) {
      if (!currentPath.includes(comp)) {
        layersRef.current.delete(comp);
      }
    }
    prevPathRef.current = currentPath;
  }, [currentPath]);

  // 获取或创建指定组件的层
  const getLayer = useCallback(
    (
      owner: React.ComponentType<any>,
    ): { bindings: BoundKeyEntry[]; blockedKeys: string[] } => {
      let layer = layersRef.current.get(owner);
      if (!layer) {
        layer = { bindings: [], blockedKeys: [] };
        layersRef.current.set(owner, layer);
      }
      return layer;
    },
    [],
  );


  const boundKeyboard = useCallback(
    (
      keys: string[],
      handler: KeyHandler,
      options?: BoundKeyboardOptions,
    ): (() => void) => {
      const path = _currentPath;
      if (path.length === 0) {
        throw new Error(
          '[Ink-Trc] boundKeyboard() 必须在屏幕组件内调用。当前无活跃屏幕。',
        );
      }
      const owner = path[path.length - 1];
      const layer = getLayer(owner);

      const entry: BoundKeyEntry = {
        keys,
        handler,
        onlyThis: options?.onlyThis ?? false,
        owner,
      };

      layer.bindings.push(entry);

      // 返回解绑函数
      return () => {
        const idx = layer.bindings.indexOf(entry);
        if (idx !== -1) {
          layer.bindings.splice(idx, 1);
        }
      };
    },
    [getLayer],
  );


  const blockedKey = useCallback(
    (keys: string[]) => {
      const path = _currentPath;
      if (path.length === 0) {
        throw new Error(
          '[Ink-Trc] blockedKey() 必须在屏幕组件内调用。',
        );
      }
      const owner = path[path.length - 1];
      const layer = getLayer(owner);

      for (const k of keys) {
        if (!layer.blockedKeys.includes(k)) {
          layer.blockedKeys.push(k);
        }
      }
    },
    [getLayer],
  );


  const value = useMemo(
    () => ({ boundKeyboard, blockedKey }),
    [boundKeyboard, blockedKey],
  );


  useInput((input, key) => {
    const eventNames = normalizeKeyNames(input, key);

    // 优先级 1：Overlay
    const overlayComp = _currentOverlayComponent;
    if (overlayComp) {
      const overlayLayer = layersRef.current.get(overlayComp);
      if (overlayLayer) {
        const blocked = overlayLayer.blockedKeys;
        const unblocked = eventNames.filter((n) => !blocked.includes(n));
        if (unblocked.length > 0) {
          for (const binding of overlayLayer.bindings) {
            if (binding.keys.some((k) => unblocked.includes(k))) {
              binding.handler(input, key);
              return; // overlay 处理了，停止传播
            }
          }
        }
      }
    }

    // 优先级 2：屏幕栈顶 → 栈底冒泡
    const path = _currentPath;
    for (let i = path.length - 1; i >= 0; i--) {
      const comp = path[i];
      const layer = layersRef.current.get(comp);
      if (!layer) continue;

      // blockedKey 过滤
      const blocked = layer.blockedKeys;
      const unblocked = eventNames.filter((n) => !blocked.includes(n));

      // 全部被屏蔽 → 跳过本层
      if (unblocked.length === 0) continue;

      for (const binding of layer.bindings) {
        // onlyThis：非栈顶时跳过
        // onlyThis：仅在 (1) 本层是栈顶 且 (2) 无 overlay 激活时生效
        if (binding.onlyThis && (i !== path.length - 1 || _currentOverlayComponent !== null)) continue;
        
        if (binding.keys.some((k) => unblocked.includes(k))) {
          binding.handler(input, key);
          return; // 处理了，停止冒泡
        }
      }
    }

    // 优先级 3：无任何层处理 → 丢弃
  });

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}
