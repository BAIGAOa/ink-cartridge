export { registerComponent } from './registry.js';
export {
  ScenarioManagementProvider,
  skip,
  back,
  gotoScreen,
  openOverlay,
  closeOverlay,
  closeAllOverlays,
  activateOverlay,
  deactivateOverlay,
  clearDispatchers,
} from './provider.js';
export type { ScenarioManagementProviderProps } from './provider.js';
export { useScreenSystem } from './hook.js';
export { CurrentScreen } from './current-screen.js';
export type {
  SkipOptions,
  SkipFn,
  BackFn,
  GotoScreenFn,
  OpenOverlayFn,
  CloseOverlayFn,
  CloseAllOverlaysFn,
  ActivateOverlayFn,
  DeactivateOverlayFn,
  OpenOverlayOptions,
  OverlayEntry,
  RegisterOptions,
} from './types.js';
