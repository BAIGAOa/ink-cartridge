import { useContext } from 'react';
import { ScreenSystemContext, ScreenSystemContextValue } from './context.js';

/**
 * 获取屏幕系统能力
 * 
 * 必须在 <ScenarioManagementProvider> 内部使用
 */
export function useScreenSystem(): ScreenSystemContextValue {
  const ctx = useContext(ScreenSystemContext);
  if (!ctx) {
    throw new Error(
      '[Ink-Component] useScreenSystem() 必须在 <ScenarioManagementProvider> 内部使用。',
    );
  }
  return ctx;
}