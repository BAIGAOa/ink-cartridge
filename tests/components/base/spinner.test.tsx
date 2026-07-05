import { describe, it, expect, afterEach, vi } from 'vitest';
import { Spinner } from '../../../src/components/spinner/Spinner.js';
import { renderComponent } from './_helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Spinner', () => {
  it('renders default frame (first character)', () => {
    const { lastFrameClean } = renderComponent(Spinner);
    expect(lastFrameClean()).toBe('⠋');
  });

  it('renders label', () => {
    const { lastFrameClean } = renderComponent(Spinner, { label: 'Working...' });
    expect(lastFrameClean()).toContain('Working...');
  });

  it('active=false stays on first frame', () => {
    const { lastFrameClean } = renderComponent(Spinner, { active: false });
    expect(lastFrameClean()).toBe('⠋');
  });

  it('renders specified type', () => {
    const { lastFrameClean } = renderComponent(Spinner, { type: 'simple' });
    expect(lastFrameClean()).toBe('|');
  });

  it('custom color does not throw', () => {
    const { lastFrame } = renderComponent(Spinner, { color: 'red' });
    expect(lastFrame()).toBeTruthy();
  });
});
