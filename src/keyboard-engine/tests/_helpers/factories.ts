import type {
  ScreenKeyboardLayer,
  BoundKeyEntry,
  GlobalKeyEntry,
  GlobalSequenceEntry,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  PipelineContext,
  PendingSequence,
  SequenceBinding,
  FocusTarget,
  MutableRef,
  GlobalPendingSequence,
  EngineOverlayEntry,
  ShortcutOperationEntry,
  SequenceOperationEntry,
  KeyboardProcessorProps,
} from '../../src/types.js';
import KeyboardEngine from '../../src/KeyboardEngine.js';

/**
 * Create a KeyboardEngine instance with a minimal normalizeKeyNames adapter.
 * input is used directly as the normalized key name (when non-empty).
 */
export function createEngine(
  modes?: string[],
  defaultMode?: string,
  autoTab?: boolean,
): KeyboardEngine {
  return new KeyboardEngine({
    modes,
    defaultMode,
    normalizeKeyNames: (input: string, _key: unknown) =>
      input ? [input] : [],
    autoTab,
  });
}

/**
 * Create a KeyboardEngine with custom processors injected at construction time.
 */
export function createEngineWithProcessors(
  processors: KeyboardProcessorProps[],
  modes?: string[],
  defaultMode?: string,
): KeyboardEngine {
  return new KeyboardEngine({
    modes,
    defaultMode,
    normalizeKeyNames: (input: string, _key: unknown) =>
      input ? [input] : [],
    processors,
  });
}

/**
 * Create a KeyboardEngine with a configurable normalizeKeyNames for testing
 * modifier keys, multi-key events, etc.
 */
export function createEngineWithKeys(
  keyMap: Record<string, string[]>,
  modes?: string[],
  defaultMode?: string,
  autoTab?: boolean,
): KeyboardEngine {
  return new KeyboardEngine({
    modes,
    defaultMode,
    normalizeKeyNames: (input: string, _key: unknown) =>
      keyMap[input] ?? (input ? [input] : []),
    autoTab,
  });
}

/**
 * Construct a fake ScreenKeyboardLayer with sensible defaults.
 * All mutable collections (Maps, Sets, arrays) are fresh instances.
 */
export function fakeLayer(
  overrides: Partial<ScreenKeyboardLayer> = {},
): ScreenKeyboardLayer {
  return {
    kind: 'screen',
    bindings: [],
    penetrationKeys: [],
    stoppedKeys: [],
    allowedKeys: [],
    globalKeyOverrides: new Set(),
    focusTargets: new Map(),
    defaultTargets: new Map(),
    defaultFocusOrder: [],
    currentFocusIds: [],
    actionKeysMap: new Map(),
    sequences: new Map(),
    pendingSequence: null,
    ...overrides,
  };
}

/**
 * Create a BoundKeyEntry with defaults.
 */
export function makeEntry(
  keys: string[],
  handler?: (input: string, key: unknown) => void,
  overrides?: Partial<BoundKeyEntry>,
): BoundKeyEntry {
  return {
    keys,
    handler: handler ?? (() => {}),
    onlyThis: false,
    owner: 'test',
    ...overrides,
  };
}

/**
 * Create a GlobalKeyEntry with defaults.
 */
export function makeGlobalKeyEntry(
  overrides?: Partial<GlobalKeyEntry>,
): GlobalKeyEntry {
  return {
    key: 'x',
    operate: () => {},
    ...overrides,
  };
}

/**
 * Create a GlobalSequenceEntry with defaults.
 */
export function makeGlobalSequenceEntry(
  overrides?: Partial<GlobalSequenceEntry>,
): GlobalSequenceEntry {
  return {
    keys: ['a', 'b'],
    operate: () => {},
    ...overrides,
  };
}

/**
 * Create a ResolvedGlobalKeyEntry from a GlobalKeyEntry.
 */
export function resolveGlobalKey(entry: GlobalKeyEntry): ResolvedGlobalKeyEntry {
  const operate =
    typeof entry.operate === 'string' ? () => {} : entry.operate;
  const result: ResolvedGlobalKeyEntry = {
    key: entry.key,
    operate,
    cover: entry.cover,
    affectOverlay: entry.affectOverlay,
    category: entry.category,
    times: entry.times,
    observer: entry.observer,
    executeWhenNoOverlay: entry.executeWhenNoOverlay,
    when: entry.when,
    mode: entry.mode,
  };
  if (entry.times !== undefined) {
    result.pressCount = 0;
  }
  return result;
}

/**
 * Create a ResolvedGlobalSequenceEntry from a GlobalSequenceEntry.
 */
export function resolveGlobalSequence(
  entry: GlobalSequenceEntry,
): ResolvedGlobalSequenceEntry {
  const operate =
    typeof entry.operate === 'string' ? () => {} : entry.operate;
  return {
    keys: entry.keys,
    operate,
    cover: entry.cover,
    affectOverlay: entry.affectOverlay,
    category: entry.category,
    timeout: entry.timeout,
    exclusive: entry.exclusive,
    when: entry.when,
    executeWhenNoOverlay: entry.executeWhenNoOverlay,
    mode: entry.mode,
  };
}

/**
 * Create a FocusTarget with defaults.
 */
export function fakeFocusTarget(
  overrides?: Partial<FocusTarget>,
): FocusTarget {
  return {
    bindings: [],
    penetrationKeys: [],
    stoppedKeys: [],
    allowedKeys: [],
    actionKeysMap: new Map(),
    ...overrides,
  };
}

/**
 * Create a SequenceBinding with defaults.
 */
export function makeSequenceBinding(
  keys: string[],
  handler?: (input: string, key: unknown) => void,
  overrides?: Partial<SequenceBinding>,
): SequenceBinding {
  return {
    keys,
    handler: handler ?? (() => {}),
    ...overrides,
  };
}

/**
 * Create a minimal PipelineContext for processor unit tests.
 */
export function createContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  const layersRef: MutableRef<Map<unknown | string, ScreenKeyboardLayer>> = {
    current: new Map(),
  };
  const pendingSeqRef: MutableRef<GlobalPendingSequence | null> = {
    current: null,
  };

  return {
    input: 'x',
    key: {},
    eventNames: ['x'],
    topComponent: null,
    globalKeys: [],
    globalSequences: [],
    activeOverlays: [],
    activeCount: 0,
    wildcardFirst: false,
    screenPath: [],
    activeModalId: null,
    layersRef,
    pendingSeqRef,
    notifyFocusChange: () => {},
    notifyPendingSyncs: () => {},
    anyOverlayConsumed: false,
    currentMode: null,
    conditions: new Map(),
    compositionEngineHandler: false,
    compositionEngine: undefined as unknown as PipelineContext['compositionEngine'],
    autoTab: false,
    noActiveProcessor: [],
    ...overrides,
  } as PipelineContext;
}

/**
 * Create a minimal PendingSequence for testing handleLayer sequence logic.
 */
export function makePendingSequence(
  sequences: string[],
  handler?: (input: string, key: unknown) => void,
  overrides?: Partial<PendingSequence>,
): PendingSequence {
  return {
    sequences,
    nextIndex: 1,
    handler: handler ?? (() => {}),
    timer: undefined as unknown as NodeJS.Timeout,
    timeout: 500,
    ...overrides,
  };
}

/**
 * Create a ShortcutOperationEntry.
 */
export function makeShortcutOp(
  actionId: string,
  overrides?: Partial<ShortcutOperationEntry>,
): ShortcutOperationEntry {
  return {
    actionId,
    action: () => {},
    ...overrides,
  };
}

/**
 * Create a SequenceOperationEntry.
 */
export function makeSequenceOp(
  sequenceActionId: string,
  overrides?: Partial<SequenceOperationEntry>,
): SequenceOperationEntry {
  return {
    sequenceActionId,
    action: () => {},
    ...overrides,
  };
}

/**
 * Create an EngineOverlayEntry.
 */
export function makeOverlayEntry(id: string): EngineOverlayEntry {
  return { id };
}
