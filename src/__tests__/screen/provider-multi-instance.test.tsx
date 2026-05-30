import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import {
  registerComponent,
  clearRegistry,
} from '../../screen/registry.js';
import {
  ScenarioManagementProvider,
  skip,
  back,
} from '../../screen/provider.js';

function ScreenA() {
  return React.createElement('div', null, 'A');
}
ScreenA.displayName = 'ScreenA';

function ScreenB() {
  return React.createElement('div', null, 'B');
}
ScreenB.displayName = 'ScreenB';

beforeEach(() => {
  clearRegistry();
  registerComponent(ScreenA, {});
  registerComponent(ScreenB, {}, { parent: ScreenA });
});

describe('模块级 dispatch 多实例隔离', () => {
  it('两个 Provider 共存时，各自模块级导航正常', () => {
    const r1 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider1'),
      ),
    );

    const r2 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider2'),
      ),
    );

    // 两个都在时，skip 不抛错
    expect(() => skip(ScreenB, {})).not.toThrow();

    r1.unmount();
    r2.unmount();
  });

  it('第二个 Provider 卸载后，第一个的模块级 skip 仍可用', () => {
    const r1 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider1'),
      ),
    );

    const r2 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider2'),
      ),
    );

    // 卸载第二个
    r2.unmount();

    // 第一个的模块级 skip 仍可调用
    expect(() => skip(ScreenB, {})).not.toThrow();

    r1.unmount();
  });

  it('所有 Provider 卸载后，模块级导航抛出正确错误', () => {
    const r = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider1'),
      ),
    );

    r.unmount();

    expect(() => skip(ScreenB, {})).toThrow(
      '[Ink-Router-Kit] Navigation function called before Provider is mounted.',
    );
  });

  it('back 在多实例场景下正常', () => {
    const r1 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider1'),
      ),
    );

    const r2 = render(
      React.createElement(
        ScenarioManagementProvider,
        { defaultScreen: ScreenA },
        React.createElement('div', null, 'Provider2'),
      ),
    );

    // 先 skip 到 ScreenB，再 back
    skip(ScreenB, {});
    expect(() => back()).not.toThrow();

    r2.unmount();

    // 第一个实例的 back 仍可用
    expect(() => back()).not.toThrow();

    r1.unmount();
  });
});
