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

function renderFold(props?: { expanded?: boolean; onToggle?: () => void; preview?: React.ReactNode; storage?: StorageAPI; storageKey?: string }) {
  function Host() {
    return React.createElement(Fold as any, {
      focusId: 'fold',
      label: 'Settings',
      expanded: props?.expanded,
      onToggle: props?.onToggle,
      preview: props?.preview,
      storage: props?.storage,
      storageKey: props?.storageKey,
    }, React.createElement(Text, null, 'Hidden content'));
  }

  clearRegistry();
  registerComponent(Host, {});
  const { lastFrame, stdin, unmount } = render(
    React.createElement(ScenarioManagementProvider as any, { defaultScreen: Host },
      React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
    ),
  );
  return { lastFrame, lastFrameClear: () => stripAnsi(lastFrame() ?? ''), stdin, unmount };
}

beforeEach(() => clearRegistry());
afterEach(() => vi.restoreAllMocks());

describe('Fold', () => {
  it('collapsed state shows preview, not children', () => {
    const { lastFrameClear } = renderFold({ preview: React.createElement(Text, null, 'Preview text') });
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

    // simulate Space + re-render (controlled mode: onToggle does not update internal state)
    stdin.write(' ');
    await new Promise(r => setTimeout(r, 10));

    // controlled mode: onToggle is called, but parent must update expanded prop
    expect(expanded).toBe(true);
  });

  it('uncontrolled mode defaultExpanded=true initially expanded', () => {
    function Host() {
      return React.createElement(Fold as any, {
        focusId: 'fold',
        label: 'Test',
        defaultExpanded: true,
      }, React.createElement(Text, null, 'Content inside'));
    }

    clearRegistry();
    registerComponent(Host, {});
    const { lastFrame } = render(
      React.createElement(ScenarioManagementProvider as any, { defaultScreen: Host },
        React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
      ),
    );
    const output = stripAnsi(lastFrame());
    expect(output).toContain('Content inside');
  });
});

describe('Fold persistence', () => {

  it('writes to storage after expand/collapse when storage is passed', async () => {
    const { api } = makeMockStorage();

    function Host() {
      return React.createElement(Fold as any, {
        focusId: 'pf',
        label: 'Test',
        storage: api,
      }, React.createElement(Text, null, 'Inside'));
    }
    clearRegistry();
    registerComponent(Host, {});
    const { stdin } = render(
      React.createElement(ScenarioManagementProvider as any, { defaultScreen: Host },
        React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
      ),
    );
    await flush();

    stdin.write(' ');
    await flush();

    expect((api.write.b as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('fold:pf', true);
  });

  it('uses custom key when storageKey is passed', async () => {
    const { api } = makeMockStorage();

    function Host() {
      return React.createElement(Fold as any, {
        focusId: 'pf',
        label: 'Test',
        storage: api,
        storageKey: 'custom-fold-key',
      }, React.createElement(Text, null, 'Inside'));
    }
    clearRegistry();
    registerComponent(Host, {});
    render(
      React.createElement(ScenarioManagementProvider as any, { defaultScreen: Host },
        React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
      ),
    );
    await flush();

    expect((api.read.b as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('custom-fold-key', false);
  });

  it('does not affect existing behavior when storage is not passed', async () => {
    function Host() {
      return React.createElement(Fold as any, {
        focusId: 'pf',
        label: 'Test',
      }, React.createElement(Text, null, 'Inside'));
    }
    clearRegistry();
    registerComponent(Host, {});
    const { lastFrame } = render(
      React.createElement(ScenarioManagementProvider as any, { defaultScreen: Host },
        React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
      ),
    );
    await flush();
    expect(stripAnsi(lastFrame())).toContain('Test');
    expect(stripAnsi(lastFrame())).not.toContain('Inside');
  });
});
