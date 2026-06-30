import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { Text } from 'ink';
import React from 'react';
import { registerComponent } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import {
  Menu,
  GameLevel,
  Notification,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';

function stripAnsi(str: string | undefined): string {
  return (str ?? '').replace(/\x1b\[[0-9;]*m/g, '');
}

beforeEach(() => {
  setupBaseScreenTests();
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

describe('ScenarioManagementProvider default screen', () => {
  it('renders the initial screen specified by defaultScreen', () => {
    const { lastFrame } = renderWithCapture(Menu);
    expect(stripAnsi(lastFrame())).toContain('Menu');
  });

  it('falls back to the registered template when no defaultParams are given', () => {
    // GameLevel is registered with template { level: 1 }, so its
    // rendered output should show "Level 1" even without defaultParams.
    const { lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={GameLevel}>
        <CurrentScreen />
      </ScenarioManagementProvider>,
    );
    expect(stripAnsi(lastFrame())).toContain('Level 1');
  });

  it('renders nothing when defaultScreen is not a registered component', () => {
    function Unregistered() {
      return <Text>x</Text>;
    }

    // The Provider throws during render because the component is not
    // registered. React 19 catches the error and the tree renders nothing.
    const { lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={Unregistered as any}>
        <Text>child</Text>
      </ScenarioManagementProvider>,
    );

    expect(stripAnsi(lastFrame())).not.toContain('x');
    expect(stripAnsi(lastFrame())).not.toContain('child');
  });

  it('initializes currentPath to [defaultScreen]', () => {
    const { getCapture } = renderWithCapture(Menu);
    expect(getCapture()!.currentPath).toEqual([Menu]);
  });

  it('uses template defaults when skipping to a child with empty params', () => {
    function Echo({ value }: { value: string }) {
      return <Text>{value}</Text>;
    }
    registerComponent(Echo, { value: 'template-default' }, { parent: Menu });

    const { getCapture, lastFrame } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.skip(Echo, {} as any);
    });

    expect(stripAnsi(lastFrame())).toContain('template-default');
  });
});

describe('CurrentScreen', () => {
  it('renders only the top of the screen stack when no overlays are open', () => {
    const { lastFrame } = renderWithCapture(Menu);
    expect(stripAnsi(lastFrame())).toContain('Menu');
  });

  it('renders both the screen and open overlays simultaneously', () => {
    const { getCapture, lastFrame } = renderWithCapture(Menu);
    const ctx = getCapture()!;

    act(() => {
      ctx.openOverlay('popup-1', Notification, { message: 'popup!' });
    });

    const output = stripAnsi(lastFrame());
    expect(output).toContain('Menu');
    expect(output).toContain('popup!');
  });
});
