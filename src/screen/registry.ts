import React from 'react';

/** 模块级注册表：组件 → 模板参数 */
const registry = new Map<React.ComponentType<any>, Record<string, unknown>>();

/**
 * 注册一个组件到屏幕系统
 * @param component  组件本身（作为唯一标识）
 * @param template   参数模板对象（提供默认值和类型推断）
 */
export function registerComponent<C extends React.ComponentType<any>>(
  component: C,
  template: React.ComponentProps<C>,
): void {
  registry.set(component, template as Record<string, unknown>);
}

/** 获取组件的模板参数 */
export function getTemplate(
  component: React.ComponentType<any>,
): Record<string, unknown> | undefined {
  return registry.get(component);
}

/** 检查组件是否已注册 */
export function hasComponent(
  component: React.ComponentType<any>,
): boolean {
  return registry.has(component);
}