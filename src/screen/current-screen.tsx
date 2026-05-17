import React from 'react';
import { Box } from 'ink';
import { useScreenSystem } from './hook.js';

/**
 * 渲染当前屏幕和 overlay
 * 
 * 可选放置在组件树的任意位置。
 * overlay 激活时：底层屏幕 + overlay 同时渲染（overlay 在视觉上层）
 * 无 overlay 时：只渲染栈顶屏幕
 */
export function CurrentScreen(): React.ReactNode {
  const { currentScreen, currentOverlay } = useScreenSystem();

  // 无 overlay：直接返回屏幕元素
  if (!currentOverlay) {
    return currentScreen as React.ReactElement;
  }

  // 有 overlay：屏幕在底层，overlay 覆盖在上层
  return React.createElement(Box, { flexDirection: 'column', width: '100%', height: '100%' },
    currentScreen as React.ReactElement,
    currentOverlay as React.ReactElement,
  );
}