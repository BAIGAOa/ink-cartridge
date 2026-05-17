import { createContext } from 'react';
import type { KeyHandler, BoundKeyboardOptions } from './types.js';

export interface KeyboardContextValue {
  /** 绑定按键到当前层 */
  boundKeyboard: (
    keys: string[],
    handler: KeyHandler,
    options?: BoundKeyboardOptions,
  ) => () => void;

  /** 屏蔽指定按键，本层对这些键透明 */
  blockedKey: (keys: string[]) => void;
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null);