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
export type {
  EntryWithOptionalKeys,
  KeyRuleContainer,
} from "./providers/helpers.js";

export { default as CompositionEngine } from "./CompositionEngine.js";
export type {
  CompositioKey,
  CompositionContext,
  ValueGuard,
  ValueSchema,
  Flags,
  FlagTransition,
  CompositionEvent,
  CompositionStartedEvent,
  CompositionContinuedEvent,
  CompositionCompletedEvent,
  CompositionAbortedEvent,
  CompositionBrokenEvent,
  CompositionConsumedEvent,
  CompositionUndoneEvent,
  CompositionClearedEvent,
  MappingKeyEvent,
  MappingKeyStartedEvent,
  MappingKeyContinuedEvent,
  MappingKeyCompletedEvent,
  MappingKeyBrokenEvent,
  MappingKeyConsumedEvent,
  MappingKeyEntry,
} from "./CompositionEngine.js";
export { defaultTargetsSymbol } from "./types/default-targets-symbol.js";

export { createModalProcessor } from "./processors/modal.js";
export { createCompositionProcessor } from "./processors/globalComposition.js";
export { createGlobalSequenceProcessor } from "./processors/globalSequence.js";
export { createGlobalKeyProcessor } from "./processors/globalKey.js";
export { createLayerProcessor } from "./processors/layer.js";
export { createScreenStackProcessor } from "./processors/screenStack.js";

export { Mouse, MouseError } from "./xterm-mouse/index.js";
export type {
  MouseEvent as XtermMouseEvent,
  MouseEventAction,
  MouseOptions,
  MousePosition,
  MouseStreamEvent,
  ReadableStreamWithEncoding,
} from "./xterm-mouse/index.js";
export type {
  HoveredRegion,
  MouseRegionEntry,
  MouseRegionCallbacks,
  MouseRegionRect,
} from "./types/mouse-region.js";
export { ROOT_MOUSE_LAYER_ID } from "./engine/MouseRegionService.js";

export type * from "./types.js";
