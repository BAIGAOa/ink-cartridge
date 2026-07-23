export { KeyboardProvider } from "./provider/KeyboardProvider.js";
export { useKeyboard, useFocusState, useModalMissListener } from "./hook.js";

import { isNormalCharacter as engineIsNormalCharacter } from "@cartridge-engine/keyboard-engine";
import { isInkSpecialKey } from "./keyNormalizer.js";

/**
 * Determine whether the key event represents a "normal" character.
 *
 * Ink-specific wrapper — uses {@link isInkSpecialKey} to inspect
 * Ink's Key descriptor for special keys.
 *
 * @param input - Raw character from Ink's useInput.
 * @param key   - Key descriptor from Ink.
 * @returns true when the event should be treated as a normal character.
 */
export function isNormalCharacter(input: string, key: unknown): boolean {
  return engineIsNormalCharacter(input, key, isInkSpecialKey);
}
export { isInkSpecialKey, normalizeKeyNames } from "./keyNormalizer.js";

export { KeyboardEngine } from "@cartridge-engine/keyboard-engine";
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
  createCompositionProcessor,
  createGlobalSequenceProcessor,
  createGlobalKeyProcessor,
  createOverlayProcessor,
  createScreenStackProcessor,
} from "@cartridge-engine/keyboard-engine";

export type { EngineProps } from "@cartridge-engine/keyboard-engine";
export type { BuiltinProcessorId } from "@cartridge-engine/keyboard-engine";
export type { KeyRuleContainer } from "@cartridge-engine/keyboard-engine";
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
  CompositioKey,
  CompositionContext,
  ValueGuard,
  ValueSchema,
  Flags,
  MappingKeyEvent,
  MappingKeyEntry,
} from "@cartridge-engine/keyboard-engine";

export type { KeyboardProviderProps } from "./provider/KeyboardProvider.js";
