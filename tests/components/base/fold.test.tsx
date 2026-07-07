import { stripAnsi, flush, makeMockStorage } from './_helpers.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { Fold } from '../../../src/components/fold/Fold.js';
import type { StorageAPI } from '../../../src/storage/index.js';

function renderFold(props?: {
  expanded?: boolean;
  onToggle?: () => void;
  preview?: React.ReactNode;
  storage?: StorageAPI;
  storageKey?: string;
}) {
  function Host() {
    return (
      <Fold
        focusId="fold"
        label="Settings"
        expanded={props?.expanded}
        onToggle={props?.onToggle}
        preview={props?.preview}
        storage={props?.storage}
        storageKey={props?.storageKey}
      >
        <Text>Hidden content</Text>
      </Fold>
    );
  }

  clearRegistry();
  registerComponent(Host, {});
  const { lastFrame, stdin, unmount } = render(
    <ScenarioManagementProvider defaultScreen={Host}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
  );
  return { lastFrame, lastFrameClear: () => stripAnsi(lastFrame() ?? ''), stdin, unmount };
}

beforeEach(() => clearRegistry());
afterEach(() => vi.restoreAllMocks());

describe('Fold', () => {
  it('collapsed state shows preview, not children', () => {
    const { lastFrameClear } = renderFold({ preview: <Text>Preview text</Text> });
    expect(lastFrameClear()).toContain('Settings');
    expect(lastFrameClear()).toContain('Preview text');
    expect(lastFrameClear()).not.toContain('Hidden content');
  });

  it('collapsed state shows label, not children', () => {
    const { lastFrameClear } = renderFold();
    expect(lastFrameClear()).toContain('Settings');
    expect(lastFrameClear()).not.toContain('Hidden content');
  });

  it('expanded state shows children', () => {
    const { lastFrameClear } = renderFold({ expanded: true });
    expect(lastFrameClear()).toContain('Settings');
    expect(lastFrameClear()).toContain('Hidden content');
  });

  it('Space toggles fold/expand', async () => {
    let expanded = false;
    const { stdin, lastFrameClear } = renderFold({
      expanded,
      onToggle: () => { expanded = !expanded; },
    });
    expect(lastFrameClear()).not.toContain('Hidden content');

    stdin.write(' ');
    await new Promise(r => setTimeout(r, 10));

    expect(expanded).toBe(true);
  });

  it('uncontrolled mode defaultExpanded=true initially expanded', () => {
    function Host() {
      return (
        <Fold focusId="fold" label="Test" defaultExpanded>
          <Text>Content inside</Text>
        </Fold>
      );
    }

    clearRegistry();
    registerComponent(Host, {});
    const { lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={Host}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    const output = stripAnsi(lastFrame());
    expect(output).toContain('Content inside');
  });
});

describe('Fold persistence', () => {
  it('writes to storage after expand/collapse when storage is passed', async () => {
    const { api } = makeMockStorage();

    function Host() {
      return (
        <Fold focusId="pf" label="Test" storage={api}>
          <Text>Inside</Text>
        </Fold>
      );
    }
    clearRegistry();
    registerComponent(Host, {});
    const { stdin } = render(
      <ScenarioManagementProvider defaultScreen={Host}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    await flush();

    stdin.write(' ');
    await flush();

    expect((api.write.b as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('fold:pf', true);
  });

  it('uses custom key when storageKey is passed', async () => {
    const { api } = makeMockStorage();

    function Host() {
      return (
        <Fold focusId="pf" label="Test" storage={api} storageKey="custom-fold-key">
          <Text>Inside</Text>
        </Fold>
      );
    }
    clearRegistry();
    registerComponent(Host, {});
    render(
      <ScenarioManagementProvider defaultScreen={Host}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    await flush();

    expect((api.read.b as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('custom-fold-key', false);
  });

  it('does not affect existing behavior when storage is not passed', async () => {
    function Host() {
      return (
        <Fold focusId="pf" label="Test">
          <Text>Inside</Text>
        </Fold>
      );
    }
    clearRegistry();
    registerComponent(Host, {});
    const { lastFrame } = render(
      <ScenarioManagementProvider defaultScreen={Host}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    await flush();
    expect(stripAnsi(lastFrame())).toContain('Test');
    expect(stripAnsi(lastFrame())).not.toContain('Inside');
  });

  it('reads expanded state from storage on mount', async () => {
    const { store, api } = makeMockStorage();
    store['fold:pf'] = true;

    function Host() {
      return (
        <Fold focusId="pf" label="Test" storage={api}>
          <Text>Inside</Text>
        </Fold>
      );
    }
    clearRegistry();
    registerComponent(Host, {});
    render(
      <ScenarioManagementProvider defaultScreen={Host}>
        <KeyboardProvider>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    await flush();

    // Verify storage was queried with the correct key
    expect((api.read.b as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('fold:pf', false);
  });
});
