export { default as KeyboardEngine } from "./KeyboardEngine.js";
export type { EngineProps } from "./KeyboardEngine.js";

export { isNormalCharacter } from "./isNormalCharacter.js";

export { checkWhen } from "./checkWhen.js";
export { checkGlobalKey } from "./checkGlobalKey.js";
export {
  handleLayer,
  tryMatchBindings,
  handleTabNavigation,
  keyMatchesRule,
} from "./layerHandler.js";

export { _insertRelative } from "./pipeline/chain.js";
export type { BuiltinProcessorId } from "./pipeline/chain.js";

export {
  cleanupGlobalKeyOverrides,
  removeKeysFromActionMap,
  pushKeyEntries,
  setIfAbsent,
  deleteIfPresent,
  modifyEntryKeys,
  clearShortcutOperations,
  finalizeBoundKeyboard,
} from "./providers/helpers.js";
export type { KeyRuleContainer } from "./providers/helpers.js";

export { default as CompositionEngine } from "./CompositionEngine.js";
export type { CompositioKey, CompositionContext, ValueGuard, ValueSchema, Flags, CompositionEvent, MappingKeyEvent, MappingKeyEntry } from "./CompositionEngine.js";

export { createModalProcessor } from "./processors/modal.js";
export { createCompositionProcessor } from "./processors/globalComposition.js";
export { createGlobalSequenceProcessor } from "./processors/globalSequence.js";
export { createGlobalKeyProcessor } from "./processors/globalKey.js";
export { createOverlayProcessor } from "./processors/overlay.js";
export { createScreenStackProcessor } from "./processors/screenStack.js";

export type {
  MutableRef,
  EngineOverlayEntry,
  EngineModalEntry,
  KeyRule,
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyEntry,
  PenetrationOptions,
  StopOptions,
  AllowModalOptions,
  ScreenKeyboardLayer,
  LayerKind,
  FocusTarget,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  SequenceOptions,
  SequenceBinding,
  PendingSequence,
  ModalMissEvent,
  ModalMissCallback,
  ModalMissOptions,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  GlobalPendingSequence,
  PipelineContext,
  PipelineProcessor,
  KeyboardProcessorProps,
} from "./types.js";
