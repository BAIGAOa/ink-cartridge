import type { Key } from 'ink';

/** 按键处理回调 */
export type KeyHandler = (input: string, key: Key) => void;

/** boundKeyboard 的选项 */
export interface BoundKeyboardOptions {
  /** 只在当前层是栈顶时生效，非栈顶时穿透 */
  onlyThis?: boolean;
}

/** 单条已绑定的按键记录 */
export interface BoundKeyEntry {
  /** 按键名列表（如 ["s", "return", "ctrl+q"]） */
  keys: string[];
  /** 处理函数 */
  handler: KeyHandler;
  /** 是否仅在本层栈顶时激活 */
  onlyThis: boolean;
  /** 所属屏幕组件（用于生命周期管理） */
  owner: React.ComponentType<any>;
}

/** 单条屏蔽的按键记录 */
export interface BlockedKeyEntry {
  /** 按键名列表 */
  keys: string[];
  /** 所属屏幕组件 */
  owner: React.ComponentType<any>;
}

/** 键盘绑定上下文——每层屏幕维护自己的绑定 */
export interface ScreenKeyboardLayer {
  /** 本层的按键绑定列表（按注册顺序） */
  bindings: BoundKeyEntry[];
  /** 本层的屏蔽键列表 */
  blockedKeys: string[];
}