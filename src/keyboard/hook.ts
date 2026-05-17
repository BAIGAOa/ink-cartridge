import { useContext } from 'react';
import { KeyboardContext, KeyboardContextValue } from './context.js';

/**
 * 获取键盘系统能力
 *
 * 必须在 <KeyboardProvider> 内部使用
 */
export function useKeyboard(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error(
      '[Ink-Trc] useKeyboard() 必须在 <KeyboardProvider> 内部使用。',
    );
  }
  return ctx;
}