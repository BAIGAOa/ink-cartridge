import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import React from 'react';
import { Text } from 'ink';
import {
  openLayer,
  applyElement,
  openModalLayer,
  applyElementToModalLayer,
} from '../../../src/screen/provider.js';
import {
  Menu,
  renderWithCapture,
  setupBaseScreenTests,
  teardownBaseScreenTests,
} from './_helpers.js';

function Greeting({ name, level }: { name: string; level?: number }) {
  return (
    <Text>
      Hello, {name}
      {level !== undefined ? ` (level ${level})` : ''}
    </Text>
  );
}

beforeEach(() => {
  setupBaseScreenTests();
});

afterEach(() => {
  teardownBaseScreenTests();
  vi.restoreAllMocks();
});

describe('applyElement with props', () => {
  it('renders layer elements with the props passed via applyElement', () => {
    const { lastFrame } = renderWithCapture(Menu);

    act(() => {
      openLayer('l1', 1);
      applyElement('l1', {
        elementId: 'e1',
        element: Greeting,
        props: { name: 'world', level: 3 },
      });
    });

    expect(lastFrame()).toContain('Hello, world (level 3)');
  });

  it('allows omitting props for elements that need none', () => {
    const { lastFrame } = renderWithCapture(Menu);

    act(() => {
      openLayer('l1', 1);
      applyElement('l1', {
        elementId: 'e1',
        element: Greeting,
        props: { name: 'alone' },
      });
    });

    expect(lastFrame()).toContain('Hello, alone');
  });

  it('renders modal layer elements with props via applyElementToModalLayer', () => {
    const { lastFrame } = renderWithCapture(Menu);

    act(() => {
      openModalLayer('m1', 10);
      applyElementToModalLayer('m1', {
        elementId: 'm1-el',
        element: Greeting,
        props: { name: 'modal-user' },
      });
    });

    expect(lastFrame()).toContain('Hello, modal-user');
  });
});
