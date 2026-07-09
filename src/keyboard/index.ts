export { KeyboardProvider } from "./provider/KeyboardProvider.js";
export { useKeyboard, useFocusState, useModalMissListener } from "./hook.js";

export { isNormalCharacter } from "@cartridge/keyboard-engine";
export { normalizeKeyNames } from "./keyNormalizer.js";

export { KeyboardEngine } from "@cartridge/keyboard-engine";
export {
  checkWhen,
  checkGlobalKey,
  handleLayer,
  tryMatchBindings,
  handleTabNavigation,
  keyMatchesRule,
  _insertRelative,
  cleanupGlobalKeyOverrides,
  removeKeysFromActionMap,
  pushKeyEntries,
  setIfAbsent,
  deleteIfPresent,
  modifyEntryKeys,
  clearShortcutOperations,
  finalizeBoundKeyboard,
  createModalProcessor,
  createGlobalSequenceProcessor,
  createGlobalKeyProcessor,
  createOverlayProcessor,
  createScreenStackProcessor,
} from "@cartridge/keyboard-engine";

export type { EngineProps } from "@cartridge/keyboard-engine";
export type { BuiltinProcessorId } from "@cartridge/keyboard-engine";
export type { KeyRuleContainer } from "@cartridge/keyboard-engine";
export type {
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyEntry,
  PenetrationOptions,
  AllowModalOptions,
  StopOptions,
  ScreenKeyboardLayer,
  LayerKind,
  FocusTarget,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  SequenceOptions,
  SequenceBinding,
  PendingSequence,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  ModalMissEvent,
  ModalMissCallback,
  ModalMissOptions,
  ResolvedGlobalKeyEntry,
  KeyboardProcessorProps,
  PipelineProcessor,
  MutableRef,
} from "@cartridge/keyboard-engine";

export type { KeyboardProviderProps } from "./provider/KeyboardProvider.js";
