import { stripAnsi, flush, press } from './_helpers.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { registerComponent, clearRegistry } from '../../../src/screen/registry.js';
import { ScenarioManagementProvider } from '../../../src/screen/provider.js';
import { CurrentScreen } from '../../../src/screen/current-screen.js';
import { KeyboardProvider } from '../../../src/keyboard/provider.js';
import { useKeyboard } from '../../../src/keyboard/hook.js';
import { useScreenSystem } from '../../../src/screen/hook.js';
import { ConfirmDialog } from '../../../src/components/dialog/ConfirmDialog.js';

const KEYS = {
  enter: '\r',
  escape: '\x1b',
} as const;




function renderDialog(props: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

  function HostScreen() {
    const kb = useKeyboard();
    const { openOverlay: showOverlay } = useScreenSystem();
    useEffect(() => {
      kbRef.current = kb;
      showOverlay('confirm-dialog', ConfirmDialog, {
        title: props.title,
        message: props.message,
        confirmLabel: props.confirmLabel,
        cancelLabel: props.cancelLabel,
        onConfirm,
        onCancel,
      });
    }, []);
    return React.createElement(Text, null, 'Host');
  }
  HostScreen.displayName = 'HostScreen';

  clearRegistry();
  registerComponent(HostScreen, {});
  registerComponent(ConfirmDialog, {
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const { lastFrame, stdin, unmount } = render(
    React.createElement(
      ScenarioManagementProvider as any,
      { defaultScreen: HostScreen },
      React.createElement(KeyboardProvider, null, React.createElement(CurrentScreen)),
    ),
  );

  return {
    lastFrame,
    lastFrameClean: () => stripAnsi(lastFrame()),
    stdin,
    unmount,
    onConfirm,
    onCancel,
    kbRef,
  };
}

beforeEach(() => {
  clearRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConfirmDialog', () => {
  // overlay render chain: effect dispatch → re-render → mount → effect, needs two flushes
  async function settle() {
    await flush();
    await flush();
  }

  it('renders title, message and two buttons', async () => {
    const { lastFrameClean } = renderDialog({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: () => {},
      onCancel: () => {},
    });

    await settle();

    const output = lastFrameClean();
    expect(output).toContain('Test Title');
    expect(output).toContain('Test Message');
    expect(output).toContain('确认');
    expect(output).toContain('取消');
  });

  it('custom button labels', async () => {
    const { lastFrameClean } = renderDialog({
      title: 'Delete',
      message: 'Sure?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      onConfirm: () => {},
      onCancel: () => {},
    });

    await settle();

    const output = lastFrameClean();
    expect(output).toContain('Delete');
    expect(output).toContain('Keep');
  });

  it('Esc triggers onCancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = renderDialog({
      title: 'X',
      message: 'Y',
      onConfirm,
      onCancel,
    });

    await settle();

    await press(stdin, KEYS.escape);
    await flush();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Enter triggers onConfirm on confirm button', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = renderDialog({
      title: 'X',
      message: 'Y',
      onConfirm,
      onCancel,
    });

    await settle();

    await press(stdin, KEYS.enter);
    await flush();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('Enter triggers onCancel after focusing cancel button', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin, kbRef } = renderDialog({
      title: 'X',
      message: 'Y',
      onConfirm,
      onCancel,
    });

    await settle();

    kbRef.current!.focusSet('dialog-cancel');
    await flush();

    await press(stdin, KEYS.enter);
    await flush();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
