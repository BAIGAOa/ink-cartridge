// ── Screen System ──────────────────────────────────────────
export {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  skip,
  back,
  gotoScreen,
  openOverlay,
  closeOverlay,
  closeAllOverlays,
  activateOverlay,
  deactivateOverlay,
  openModal,
  closeModal,
  closeAllModals,
  useScreenSystem,
  ModalContext,
} from "./screen/index.js";

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
  OpenModalFn,
  CloseModalFn,
  CloseAllModalsFn,
  OpenOverlayOptions,
  OpenModalOptions,
  OverlayEntry,
  ModalEntry,
  RegisterOptions,
  ScenarioManagementProviderProps,
} from "./screen/index.js";

// ── Keyboard System ────────────────────────────────────────
export { KeyboardProvider, useKeyboard, KeyboardEngine } from "./keyboard/index.js";
export { normalizeKeyNames, isNormalCharacter } from "./keyboard/index.js";

export type {
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyEntry,
  ScreenKeyboardLayer,
  KeyboardProviderProps,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  KeyboardProcessorProps,
  BuiltinProcessorId,
  PipelineProcessor,
  EngineProps,
} from "./keyboard/index.js";

export type {
  PenetrationOptions,
  AllowModalOptions,
  StopOptions,
  LayerKind,
  FocusTarget,
  SequenceOptions,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  ModalMissEvent,
  ModalMissCallback,
  ModalMissOptions,
  ResolvedGlobalKeyEntry,
} from "./keyboard/index.js";
export { useFocusState, useModalMissListener } from "./keyboard/index.js";


// Components — SelectInput
export { SelectInput } from "./components/select/SelectInput.js";
export type { Item } from "./components/select/types.js";
export type { SelectInputProps } from "./components/select/types.js";

// Components — SelectRow
export { SelectRow } from "./components/select-row/SelectRow.js";
export type { SelectRowProps } from "./components/select-row/types.js";

// Components — MultiSelectInput
export { MultiSelectInput } from "./components/multi-select/MultiSelectInput.js";
export type { MultiSelectInputProps } from "./components/multi-select/types.js";

// Components — TextInput
export { TextInput, UncontrolledTextInput } from "./components/text/TextInput.js";
export type { TextInputProps, UncontrolledTextInputProps } from "./components/text/types.js";

// Components — Dialog
export { ConfirmDialog } from "./components/dialog/ConfirmDialog.js";
export type { ConfirmDialogProps } from "./components/dialog/types.js";

// Components — Spinner
export { Spinner } from "./components/spinner/Spinner.js";
export type { SpinnerType } from "./components/spinner/Spinner.js";

// Components — ProgressBar
export { ProgressBar } from "./components/progress-bar/ProgressBar.js";

// Components — Divider
export { Divider } from "./components/divider/Divider.js";

// Components — Badge
export { Badge } from "./components/badge/Badge.js";

// Components — KeyHint
export { KeyHint } from "./components/key-hint/KeyHint.js";

// Components — NumberInput
export { NumberInput } from "./components/number-input/NumberInput.js";

// Components — SearchInput
export { SearchInput } from "./components/search-input/SearchInput.js";

// Components — SearchBar
export { default as SearchBar } from "./components/search-bar/SearchBar.js";
export type { SearchBarItem, SearchBarProps } from "./components/search-bar/search-bar-types.js";

// Components — Tabs
export { Tabs } from "./components/tabs/Tabs.js";
export type { Tab, TabsProps } from "./components/tabs/types.js";

// Components — Fold
export { Fold } from "./components/fold/Fold.js";
export type { FoldProps } from "./components/fold/types.js";

// Components — Form
export { Form } from "./components/form/Form.js";
export { Field } from "./components/form/Field.js";
export { useFormContext } from "./components/form/context.js";
export type {
  FormProps,
  FieldProps,
  FieldRenderProps,
  FormContextValue,
  Validator,
} from "./components/form/types.js";

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

// Dev Tool
export { openDevTool, closeDevTool } from "./dev/entrance.js";
export type { DevProps } from "./dev/types.js";
