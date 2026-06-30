import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import {
  registerComponent,
  getTemplate,
  hasComponent,
  getParent,
  getChildren,
  isChildOf,
  getRoots,
  clearRegistry,
} from '../../../src/screen/registry.js';

function Menu() {
  return React.createElement('div', null, 'Menu');
}

function Settings({ theme }: { theme: string }) {
  return React.createElement('div', null, theme);
}

function GameLevel({ level }: { level: number }) {
  return React.createElement('div', null, String(level));
}

function Combat({ enemy }: { enemy: string }) {
  return React.createElement('div', null, enemy);
}

function Inventory({ items }: { items: string[] }) {
  return React.createElement('div', null, String(items.length));
}

beforeEach(() => {
  clearRegistry();
});

describe('registerComponent', () => {
  it('makes hasComponent return true after registration', () => {
    registerComponent(Menu, {});
    expect(hasComponent(Menu)).toBe(true);
  });

  it('stores and returns the template via getTemplate', () => {
    registerComponent(Settings, { theme: 'dark' });
    expect(getTemplate(Settings)).toEqual({ theme: 'dark' });
  });

  it('throws when registering the same component twice', () => {
    registerComponent(Menu, {});
    expect(() => registerComponent(Menu, {})).toThrow(
      'is already registered',
    );
  });

  it('allows multiple distinct components to be registered independently', () => {
    registerComponent(Menu, {});
    registerComponent(Settings, { theme: 'dark' });
    expect(hasComponent(Menu)).toBe(true);
    expect(hasComponent(Settings)).toBe(true);
  });

  it('returns false from hasComponent for an unregistered component', () => {
    expect(hasComponent(Combat)).toBe(false);
  });

  it('returns undefined from getTemplate for an unregistered component', () => {
    expect(getTemplate(Combat)).toBeUndefined();
  });
});

describe('component tree', () => {
  it('treats a component registered without a parent as a root node', () => {
    registerComponent(Menu, {});
    expect(getParent(Menu)).toBeNull();
    expect(getRoots()).toContain(Menu);
  });

  it('establishes a parent-child relationship via the parent option', () => {
    registerComponent(Menu, {});
    registerComponent(Settings, { theme: 'dark' }, { parent: Menu });
    expect(getParent(Settings)).toBe(Menu);
  });

  it('returns all direct children via getChildren', () => {
    registerComponent(Menu, {});
    registerComponent(Settings, { theme: 'dark' }, { parent: Menu });
    registerComponent(GameLevel, { level: 1 }, { parent: Menu });
    const children = getChildren(Menu);
    expect(children).toContain(Settings);
    expect(children).toContain(GameLevel);
    expect(children).toHaveLength(2);
  });

  it('reports direct child relationships correctly via isChildOf', () => {
    registerComponent(Menu, {});
    registerComponent(GameLevel, { level: 1 }, { parent: Menu });
    registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });

    expect(isChildOf(GameLevel, Menu)).toBe(true);
    expect(isChildOf(Combat, GameLevel)).toBe(true);
    // isChildOf only checks direct parent, not transitive ancestry.
    expect(isChildOf(Combat, Menu)).toBe(false);
    expect(isChildOf(Settings, Menu)).toBe(false);
  });

  it('handles multi-level nesting correctly', () => {
    // Menu → GameLevel → Combat
    //                  → Inventory
    registerComponent(Menu, {});
    registerComponent(GameLevel, { level: 1 }, { parent: Menu });
    registerComponent(Combat, { enemy: 'goblin' }, { parent: GameLevel });
    registerComponent(Inventory, { items: [] }, { parent: GameLevel });

    expect(getParent(Menu)).toBeNull();
    expect(getParent(GameLevel)).toBe(Menu);
    expect(getParent(Combat)).toBe(GameLevel);
    expect(getParent(Inventory)).toBe(GameLevel);

    const menuChildren = getChildren(Menu);
    expect(menuChildren).toHaveLength(1);
    expect(menuChildren).toContain(GameLevel);

    const gameChildren = getChildren(GameLevel);
    expect(gameChildren).toHaveLength(2);
    expect(gameChildren).toContain(Combat);
    expect(gameChildren).toContain(Inventory);

    expect(getChildren(Combat)).toHaveLength(0);
  });

  it('returns all root nodes via getRoots', () => {
    registerComponent(Menu, {});
    function Standalone() {
      return React.createElement('div', null);
    }
    registerComponent(Standalone, {});

    const roots = getRoots();
    expect(roots).toHaveLength(2);
    expect(roots).toContain(Menu);
    expect(roots).toContain(Standalone);
  });
});
