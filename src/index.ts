// Screen System
export {
  registerComponent,
  clearRegistry,
  ScenarioManagementProvider,
  CurrentScreen,
  skip,
  back,
  gotoScreen,
  openLayer,
  applyElement,
  closeLayer,
  eraseElement,
  closeAllLayer,
  openModalLayer,
  applyElementToModalLayer,
  closeModalLayer,
  eraseElementInModalLayer,
  closeAllModalLayer,
  useScreenSystem,
  ModalLayerElementContext,
  LayerElementContext,
} from "./screen/index.js";

export type {
  SkipOptions,
  SkipFn,
  BackFn,
  GotoScreenFn,
  RegisterOptions,
  ScenarioManagementProviderProps,
  Layer,
  LayerOptions,
  OpenLayerFn,
  ApplyElementFn,
  CloseLayerFn,
  EraseElementFn,
  CloseAllLayerFn,
  ActivateElementFn,
  DeactivateElementFn,
  ActivateElementInModalLayerFn,
  DeactivateElementInModalLayerFn,
  ModalLayer,
  ModalLayerOptions,
  OpenModalLayerFn,
  ApplyElementToModalLayerFn,
  CloseModalLayerFn,
  EraseElementInModalLayerFn,
  CloseAllModalLayerFn,
  LayerElement,
  LayerElementInput,
  Page,
  RegionFocusEntry,
  RegionFocusMap,
  ScreenSystemContextValue,
} from "./screen/index.js";

// Keyboard System
export { KeyboardProvider, useKeyboard, KeyboardEngine, KeyboardContext } from "./keyboard/index.js";
export { normalizeKeyNames, isInkSpecialKey, isNormalCharacter } from "./keyboard/index.js";
export { defaultTargetsSymbol } from "./keyboard/index.js";

export type {
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyboardReactOptions,
  BoundKeyEntry,
  ScreenKeyboardLayer,
  KeyboardProviderProps,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  KeyboardProcessorProps,
  BuiltinProcessorId,
  PipelineProcessor,
  EngineProps,
  KeyboardContextValue,
} from "./keyboard/index.js";

export type {
  PenetrationOptions,
  AllowModalOptions,
  StopOptions,
  LayerKind,
  FocusTarget,
  FocusRef,
  FocusSetOptions,
  SequenceOptions,
  SequenceReactOptions,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  ModalMissEvent,
  ModalMissCallback,
  ModalMissOptions,
  ResolvedGlobalKeyEntry,
  MappingKeyEvent,
  MappingKeyEntry,
} from "./keyboard/index.js";
export { useFocusState, useModalMissListener, useMouseRegion } from "./keyboard/index.js";

// I18n — Language
export { LanguageProvider } from "./language/index.js";
export { useI18n } from "./language/index.js";
export type { LanguageProviderProps, I18nContextValue } from "./language/index.js";

// Theme System
export { ThemeProvider } from "./theme/index.js";
export { useTheme } from "./theme/index.js";
export type { ThemeProviderProps, ThemeContextValue, ThemeDefinition } from "./theme/index.js";

// Event System
export { EventBus, EventProvider, createEventBus } from "./event/index.js";
export { useEventBus, useEmitter, useSubscribe } from "./event/index.js";
export type {
  EventMap,
  EventKey,
  Listener,
  Unsubscribe,
  EventProviderProps,
} from "./event/index.js";


