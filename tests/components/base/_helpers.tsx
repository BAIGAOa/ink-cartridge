import React from 'react';
import { render } from 'ink-testing-library';
import { vi } from 'vitest';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import type { StorageAPI } from '../../../src/storage/index.js';

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 10));
}

export async function press(
  stdin: { write: (data: string) => void },
  key: string,
): Promise<void> {
  stdin.write(key);
  await new Promise((r) => setTimeout(r, 10));
}

export const KEYS = {
  enter: '\r',
  escape: '\x1b',
  backspace: '\x7f',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  delete: '\x1b[3~',
  space: ' ',
} as const;

export function makeMockStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    store,
    api: {
      write: {
        num: vi.fn(async () => {}),
        str: vi.fn(async (_k: string, v: string) => { store[_k] = v; }),
        b: vi.fn(async (_k: string, v: boolean) => { store[_k] = v; }),
        obj: vi.fn(async () => {}),
        arr: vi.fn(async () => {}),
        any: vi.fn(async () => {}),
      },
      read: {
        num: vi.fn(async () => 0),
        str: vi.fn(async (k: string, def: string) => (store[k] as string) ?? def),
        b: vi.fn(async (k: string, def: boolean) => (store[k] as boolean) ?? def),
        obj: vi.fn(async () => ({})),
        arr: vi.fn(async () => []),
        any: vi.fn(async () => undefined),
      },
      has: vi.fn(async () => false),
      delete: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
      getAll: vi.fn(async () => ({})),
    } as unknown as StorageAPI,
  };
}

export function renderComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  props?: P,
) {
  const rendered = render(React.createElement(Component, props ?? ({} as P)));
  return {
    lastFrame: () => rendered.lastFrame(),
    lastFrameClean: () => stripAnsi(rendered.lastFrame() ?? ''),
    stdin: rendered.stdin,
    unmount: rendered.unmount,
  };
}

export function renderInApp(host: React.ComponentType<any>) {
  clearRegistry();
  registerComponent(host, {});
  const { lastFrame, stdin, unmount } = render(
    React.createElement(
      ScenarioManagementProvider as any,
      { defaultScreen: host },
      React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
    ),
  );
  return {
    lastFrame: () => lastFrame(),
    lastFrameClean: () => stripAnsi(lastFrame() ?? ''),
    stdin,
    unmount,
  };
}
