import { createContext } from "react";
import type {
  KeyHandler,
  BoundKeyboardOptions,
  PenetrationOptions,
  StopOptions,
  AllowModalOptions,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  SequenceOptions,
  ModalMissCallback,
  ModalMissOptions,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  GlobalPendingSequence,
  ScreenKeyboardLayer,
  PipelineProcessor,
  CompositioKey,
  CompositionContext,
  ValueSchema,
} from "@cartridge-engine/keyboard-engine";
import type { BuiltinProcessorId } from "@cartridge-engine/keyboard-engine";

export type LayerOwner = unknown | string;

export interface KeyboardContextValue {
  boundKeyboard: {
    (keys: string | string[], handler: KeyHandler, options?: BoundKeyboardOptions): () => void;
    (keys: string | string[], actionId: string, options?: BoundKeyboardOptions): () => void;
    (actionId: string, options?: BoundKeyboardOptions): () => void;
  };

  penetration: (keys: string[], options?: PenetrationOptions) => () => void;

  stop: (keys: string[], options?: StopOptions) => () => void;

  allowModal: (keys: string[], options?: AllowModalOptions) => () => void;

  globalKeys: (
    entries: GlobalKeyEntry[],
    options?: { mode?: "replace" | "add" },
  ) => void;

  getGlobalKeys: () => ResolvedGlobalKeyEntry[];

  globalSequence: (
    entries: GlobalSequenceEntry[],
    options?: { mode?: "replace" | "add" },
  ) => void;

  getGlobalSequences: () => ResolvedGlobalSequenceEntry[];

  getGlobalPendingSequence: () => GlobalPendingSequence | null;

  thereGlobalQueueWaiting: (sync?: () => void) => boolean;

  currentScreenHasSequenceWaiting: (sync?: () => void) => boolean;

  focusUnregister: (focusId: string) => void;

  focusSet: (focusId: string) => void;

  focusNext: () => void;

  focusPrev: () => void;

  focusCurrent: () => string | null;

  subscribeFocus: (listener: () => void) => () => void;

  defineShortcutAction: (entries: ShortcutOperationEntry[]) => void;
  addAction: (entry: ShortcutOperationEntry) => void;
  hasAction: (actionId: string) => boolean;
  removeAction: (actionId: string) => void;
  modifyAction: (actionId: string, keys: string[]) => void;
  clearShortcutOperations: () => void;

  defineSequenceAction: (entries: SequenceOperationEntry[]) => void;
  addSequenceAction: (entry: SequenceOperationEntry) => void;
  hasSequenceAction: (sequenceActionId: string) => boolean;
  removeSequenceAction: (sequenceActionId: string) => void;
  modifySequenceAction: (sequenceActionId: string, keys: string[], timeout?: number) => void;
  clearSequenceOperations: () => void;

  _pushOwner: (owner: LayerOwner) => void;

  _popOwner: (owner: LayerOwner) => void;

  boundSequence: {
    (keys: string | string[], handler: KeyHandler, options?: SequenceOptions): () => void;
    (actionId: string, options?: SequenceOptions): () => void;
  };

  enableWildcardPriority: () => (() => void);

  useModalMissListener: (
    cb: ModalMissCallback,
    options?: ModalMissOptions,
  ) => () => void;

  readLayer: (owner: LayerOwner) => ScreenKeyboardLayer | undefined;

  getCurrentMode: () => string | null;

  addMode: (mode: string) => boolean;

  removeMode: (mode: string) => boolean;

  setMode: (mode: string | null) => boolean;

  nextMode: () => void;

  prevMode: () => void;

  addCondition: (id: string, defaultVal: boolean) => boolean;

  setCondition: (target: string, value: boolean) => boolean;

  removeCondition: (target: string) => boolean;

  addProcessor: (
    processor: PipelineProcessor,
    options?:
      | { before?: BuiltinProcessorId | (string & {}) }
      | { after?: BuiltinProcessorId | (string & {}) }
      | { index?: number },
  ) => void;

  removeProcessor: (processorId: string) => boolean;

  getProcessors: () => readonly PipelineProcessor[];

  resetProcessors: () => void;

  registryCompositionKey: (entry: CompositioKey) => void;
  removeCompositionKey: (key: string) => boolean;
  clearAllCompositionKeys: () => void;
  hasPendingComposition: () => boolean;
  getCompositionContext: () => CompositionContext;
  abortComposition: () => void;
  updateCompositionKey: (
    key: string,
    flag: string,
    updates: Partial<Omit<CompositioKey, "key" | "flag">>,
  ) => boolean;

  setValueSchema: (schema: ValueSchema) => void;

  undoComposition: (steps?: number, options?: { isolated?: boolean }) => CompositionContext | null;
  bufferedCompositionCount: () => number;
  clearCompositionBuffers: () => void;
}

/**
 * React context for the keyboard system.
 *
 * Accessed via {@link useKeyboard}. Must be provided by a
 * {@link KeyboardProvider} nested inside a
 * {@link ScenarioManagementProvider}.
 */
export const KeyboardContext = createContext<KeyboardContextValue | null>(null);
