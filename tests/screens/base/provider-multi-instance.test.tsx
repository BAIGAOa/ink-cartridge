import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import {
  ScenarioManagementProvider,
  skip,
  back,
} from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { flush } from '../../components/base/_helpers.js';

function ScreenA() {
  return <Text>A</Text>;
}
ScreenA.displayName = 'ScreenA';

function ScreenB() {
  return <Text>B</Text>;
}
ScreenB.displayName = 'ScreenB';

beforeEach(() => {
  clearRegistry();
  registerComponent(ScreenA, {});
  registerComponent(ScreenB, {}, { parent: ScreenA });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderProvider() {
  const { unmount } = render(
    <ScenarioManagementProvider  defaultScreen={ScreenA}>
      <CurrentScreen />
    </ScenarioManagementProvider>,
  );
  return { unmount };
}

describe('module-level dispatch multi-instance isolation', () => {
  it('two Providers coexist, module-level navigation works', async () => {
    const r1 = renderProvider();
    const r2 = renderProvider();
    await flush();

    expect(() => skip(ScreenB, {})).not.toThrow();

    r1.unmount();
    r2.unmount();
  });

  it('after second Provider unmounts, first module-level skip still works', async () => {
    const r1 = renderProvider();
    const r2 = renderProvider();
    await flush();

    r2.unmount();

    expect(() => skip(ScreenB, {})).not.toThrow();

    r1.unmount();
  });

  it('after all Providers unmount, module-level navigation throws correct error', async () => {
    const r = renderProvider();
    await flush();

    r.unmount();

    expect(() => skip(ScreenB, {})).toThrow(
      '[Ink-Cartridge] Navigation function called before Provider is mounted.',
    );
  });

  it('back works in multi-instance scenario', async () => {
    const r1 = renderProvider();
    const r2 = renderProvider();
    await flush();

    skip(ScreenB, {});
    expect(() => back()).not.toThrow();

    r2.unmount();

    expect(() => back()).not.toThrow();

    r1.unmount();
  });
});
