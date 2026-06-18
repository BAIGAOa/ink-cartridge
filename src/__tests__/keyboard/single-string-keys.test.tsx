import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { registerComponent, clearRegistry } from '../../screen/registry.js';
import { ScenarioManagementProvider } from '../../screen/provider.js';
import { KeyboardProvider } from '../../keyboard/provider.js';
import { useKeyboard } from '../../keyboard/hook.js';
import type { Key } from 'ink';

let capturedInputHandler: ((input: string, key: Key) => void) | null = null;

vi.mock('ink', async (importOriginal) => {
	const actual = await importOriginal<typeof import('ink')>();
	return {
		...actual,
		useInput: (handler: (input: string, key: Key) => void) => {
			capturedInputHandler = handler;
		},
	};
});

function pressKey(input: string, key: Partial<Key> = {}) {
	if (!capturedInputHandler) throw new Error('useInput handler not captured');
	capturedInputHandler(input, {
		upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
		return: false, escape: false, backspace: false, delete: false,
		tab: false, space: false, pageDown: false, pageUp: false,
		home: false, end: false, insert: false,
		ctrl: false, shift: false, meta: false, numLock: false,
		...key,
	} as Key);
}

function Menu() {
	return React.createElement('div', null, 'Menu');
}
Menu.displayName = 'Menu';

beforeEach(() => {
	clearRegistry();
	capturedInputHandler = null;
	registerComponent(Menu, {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

function renderKeyboardTree(
	defaultScreen: React.ComponentType<any>,
): {
	getKeyboard: () => ReturnType<typeof useKeyboard> | null;
} {
	const kbRef: { current: ReturnType<typeof useKeyboard> | null } = { current: null };

	function Spy() {
		const kb = useKeyboard();
		useEffect(() => {
			kbRef.current = kb;
		}, [kb]);
		return React.createElement('div', null);
	}

	render(
		React.createElement(
			ScenarioManagementProvider,
			{ defaultScreen },
			React.createElement(KeyboardProvider, null, React.createElement(Spy)),
		),
	);

	return { getKeyboard: () => kbRef.current };
}

describe('boundKeyboard — 单字符串键名', () => {
	it('接受单个字符串键名并触发回调', () => {
		const cb = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		getKeyboard()!.boundKeyboard('s', cb);
		pressKey('s', {});
		expect(cb).toHaveBeenCalledWith('s', expect.any(Object));
	});

	it('单个字符串键名与数组形式行为一致', () => {
		const cb1 = vi.fn();
		const cb2 = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);

		getKeyboard()!.boundKeyboard('x', cb1);
		getKeyboard()!.boundKeyboard(['y'], cb2);

		pressKey('x', {});
		expect(cb1).toHaveBeenCalledTimes(1);
		expect(cb2).toHaveBeenCalledTimes(0);

		pressKey('y', {});
		expect(cb1).toHaveBeenCalledTimes(1);
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	it('单个字符串键名配合 focusId 选项', () => {
		const cb = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		// 绑定到 focus target —— 按键应触发回调
		getKeyboard()!.boundKeyboard('escape', cb, { focusId: 'my-focus' });
		pressKey('', { escape: true });
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('单字符串返回的 unbind 可取消绑定', () => {
		const cb = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		const unbind = getKeyboard()!.boundKeyboard('q', cb);
		unbind();
		pressKey('q', {});
		expect(cb).not.toHaveBeenCalled();
	});

	it('组合键 ctrl+s 单字符串形式', () => {
		const cb = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		getKeyboard()!.boundKeyboard('ctrl+s', cb);
		pressKey('s', { ctrl: true });
		expect(cb).toHaveBeenCalledWith('s', expect.objectContaining({ ctrl: true }));
	});
});

describe('boundSequence — 单字符串序列', () => {
	it('单字符串序列少于 2 键时抛出错误', () => {
		const cb = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		expect(() => {
			getKeyboard()!.boundSequence('g', cb);
		}).toThrow('boundSequence() requires at least 2 keys');
	});

	it('数组形式序列仍然正常工作（回归测试）', () => {
		const handler = vi.fn();
		const { getKeyboard } = renderKeyboardTree(Menu);
		getKeyboard()!.boundSequence(['g', 'g'], handler);

		pressKey('g');
		expect(handler).toHaveBeenCalledTimes(0);

		pressKey('g');
		expect(handler).toHaveBeenCalledTimes(1);
	});
});
