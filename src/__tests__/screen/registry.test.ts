import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

const registry = new Map<React.ComponentType<any>, Record<string, unknown>>();

function registerComponent<C extends React.ComponentType<any>>(
  component: C,
  template: React.ComponentProps<C>,
): void {
  registry.set(component, template as Record<string, unknown>);
}

function getTemplate(component: React.ComponentType<any>): Record<string, unknown> | undefined {
  return registry.get(component);
}

function hasComponent(component: React.ComponentType<any>): boolean {
  return registry.has(component);
}

function GameMenu({ text }: { text: string }) {
  return React.createElement('text', null, text);
}
GameMenu.displayName = 'GameMenu';

function GameLevel({ level }: { level: number }) {
  return React.createElement('text', null, String(level));
}
GameLevel.displayName = 'GameLevel';

beforeEach(() => {
  registry.clear();
});

describe('registerComponent', () => {
  it('注册后 hasComponent 返回 true', () => {
    registerComponent(GameMenu, { text: '' });
    expect(hasComponent(GameMenu)).toBe(true);
  });

  it('未注册的组件 hasComponent 返回 false', () => {
    expect(hasComponent(GameMenu)).toBe(false);
  });

  it('注册后 getTemplate 返回模板参数', () => {
    registerComponent(GameMenu, { text: '' });
    expect(getTemplate(GameMenu)).toEqual({ text: '' });
  });

  it('未注册的组件 getTemplate 返回 undefined', () => {
    expect(getTemplate(GameMenu)).toBeUndefined();
  });

  it('同一组件重复注册会覆盖旧模板', () => {
    registerComponent(GameMenu, { text: 'old' });
    registerComponent(GameMenu, { text: 'new' });
    expect(getTemplate(GameMenu)).toEqual({ text: 'new' });
  });

  it('多个不同组件可以分别注册', () => {
    registerComponent(GameMenu, { text: '' });
    registerComponent(GameLevel, { level: 1 });
    expect(hasComponent(GameMenu)).toBe(true);
    expect(hasComponent(GameLevel)).toBe(true);
    expect(getTemplate(GameMenu)).toEqual({ text: '' });
    expect(getTemplate(GameLevel)).toEqual({ level: 1 });
  });
});