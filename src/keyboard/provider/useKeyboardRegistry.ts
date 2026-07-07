import React, { useCallback } from 'react';
import {
  GlobalKeyEntry,
  GlobalSequenceEntry,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  GlobalPendingSequence,
  ShortcutOperationEntry,
  SequenceOperationEntry,
} from '../types.js';
import {
  setIfAbsent,
  deleteIfPresent,
  modifyEntryKeys,
} from './helpers.js';

interface RegistryRefs {
  globalKeysRef: React.MutableRefObject<{
    key: string | string[];
    operate: () => void;
    cover?: boolean;
    affectOverlay?: boolean;
    category?: React.ComponentType<any>[] | "*";
    times?: number;
    observer?: (times: number) => void;
    pressCount?: number;
    executeWhenNoOverlay?: boolean;
    when?: string | (() => boolean);
    mode?: string;
  }[]>;
  globalSequencesRef: React.MutableRefObject<{
    keys: string[];
    operate: () => void;
    cover?: boolean;
    affectOverlay?: boolean;
    category?: React.ComponentType<any>[] | "*";
    executeWhenNoOverlay?: boolean;
  }[]>;
  globalPendingSeqRef: React.MutableRefObject<{
    sequences: string[];
    nextIndex: number;
    handler: () => void;
    timer: NodeJS.Timeout;
    timeout: number;
    exclusive: boolean;
    affectOverlay: boolean;
    cover: boolean;
    category?: React.ComponentType<any>[] | "*";
    executeWhenNoOverlay?: boolean;
  } | null>;
  shortcutOperationsRef: React.MutableRefObject<Map<string, { action: () => void; keys?: string[] }>>;
  sequenceOperationsRef: React.MutableRefObject<Map<string, { action: () => void; keys?: string[]; timeout?: number }>>;
}

export function useKeyboardRegistry(refs: RegistryRefs) {
  const {
    globalKeysRef,
    globalSequencesRef,
    globalPendingSeqRef,
    shortcutOperationsRef,
    sequenceOperationsRef,
  } = refs;

  /**
   * Register global key bindings.
   */
  const globalKeys = useCallback(
    (entries: GlobalKeyEntry[], options?: { mode?: 'replace' | 'add' }) => {
      const processed = entries.map((each) => {
        if (each.times !== undefined && each.times < 1) {
          throw new Error(
            '[Ink-Cartridge] globalKeys() times option must be >= 1.',
          );
        }

        if (each.times === undefined && each.observer) {
          throw new Error(
            '[Ink-Cartridge] globalKeys() observer option requires times option to be set.',
          );
        }

        if (typeof each.operate === 'string') {
          const entry = shortcutOperationsRef.current.get(each.operate);
          if (!entry) {
            throw new Error(`[Ink-Cartridge]You want to call the shortcut ${each.operate} in the global key, but it is not registered`);
          }

          return {
            key: each.key,
            operate: entry.action,
            cover: each.cover,
            category: each.category,
            affectOverlay: each.affectOverlay,
            times: each.times,
            pressCount: each.times !== undefined ? 0 : undefined,
            observer: each.observer,
            executeWhenNoOverlay: each.executeWhenNoOverlay,
            when: each.when,
            mode: each.mode,
          };
        }
        return {
          key: each.key,
          operate: each.operate,
          cover: each.cover,
          category: each.category,
          affectOverlay: each.affectOverlay,
          times: each.times,
          pressCount: each.times !== undefined ? 0 : undefined,
          observer: each.observer,
          executeWhenNoOverlay: each.executeWhenNoOverlay,
          when: each.when,
          mode: each.mode,
        };
      });

      if (options?.mode === 'add') {
        globalKeysRef.current = [...globalKeysRef.current, ...processed];
      } else {
        globalKeysRef.current = processed;
      }
    },
    [],
  );

  /**
   * Return a shallow snapshot of the current global key list.
   */
  const getGlobalKeys = useCallback(
    (): ResolvedGlobalKeyEntry[] => [...globalKeysRef.current],
    [],
  );

  /**
   * Return a shallow snapshot of the current global sequence list.
   */
  const getGlobalSequences = useCallback(
    (): ResolvedGlobalSequenceEntry[] => [...globalSequencesRef.current],
    [],
  );

  /**
   * Return the current global pending sequence state, or null.
   */
  const getGlobalPendingSequence = useCallback(
    (): GlobalPendingSequence | null => globalPendingSeqRef.current,
    [],
  );

  /**
   * Register global sequence key bindings.
   */
  const globalSequence = useCallback(
    (entries: GlobalSequenceEntry[], options?: { mode?: 'replace' | 'add' }) => {
      const resolved: ResolvedGlobalSequenceEntry[] = entries.map((entry) => {
        if (typeof entry.operate === 'string') {
          const actionEntry = sequenceOperationsRef.current.get(entry.operate);
          if (!actionEntry) {
            throw new Error(
              `[Ink-Cartridge] You want to call the sequence action "${entry.operate}" in globalSequence, but it is not registered.`,
            );
          }
          return { ...entry, operate: actionEntry.action };
        }
        return { ...entry, operate: entry.operate };
      });

      for (const entry of resolved) {
        if (entry.keys.length < 2) {
          throw new Error(
            '[Ink-Cartridge] globalSequence() requires at least 2 keys per sequence.',
          );
        }
      }

      if (options?.mode === 'add') {
        globalSequencesRef.current = [...globalSequencesRef.current, ...resolved];
      } else {
        if (globalPendingSeqRef.current) {
          clearTimeout(globalPendingSeqRef.current.timer);
          globalPendingSeqRef.current = null;
        }
        globalSequencesRef.current = resolved;
      }
    },
    [],
  );

  const defineShortcutAction = useCallback((entries: ShortcutOperationEntry[]) => {
    for (const each of entries) {
      setIfAbsent(shortcutOperationsRef.current, each.actionId, {
        action: each.action,
        keys: each.keys,
      }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${each.actionId}`);
    }
  }, []);

  const defineSequenceAction = useCallback((entries: SequenceOperationEntry[]) => {
    for (const each of entries) {
      setIfAbsent(sequenceOperationsRef.current, each.sequenceActionId, {
        action: each.action,
        keys: each.keys,
        timeout: each.timeout,
      }, `[Ink-Cartridge] Sequence Action ${each.sequenceActionId} may not be defined repeatedly`);
    }
  }, []);

  const modifySequenceAction = useCallback((actionId: string, keys: string[], timeout?: number) => {
    const entry = modifyEntryKeys(
      sequenceOperationsRef.current,
      actionId,
      keys,
      `[Ink-Cartridge] Key not registered to Sequence Action cannot be modified, target ID is ${actionId}`,
      `[Ink-Cartridge] The target Sequence Action has no preset Keys. You cannot modify it. The ID is ${actionId}.`,
    );
    if (timeout) {
      if (entry.timeout === undefined) {
        throw new Error(
          `[Ink-Cartridge] Target Sequence Action has no default Timeout, you cannot modify, ID is ${actionId}`,
        );
      }
      entry.timeout = timeout;
    }
  }, []);

  const modifyAction = useCallback((actionId: string, keys: string[]) => {
    modifyEntryKeys(
      shortcutOperationsRef.current,
      actionId,
      keys,
      `[Ink-Cartridge] Cannot modify action "${actionId}": action not registered.`,
      `[Ink-Cartridge] Cannot modify action "${actionId}": action was not registered with a 'keys' field.`,
    );
  }, []);

  const addSequenceAction = useCallback((entry: SequenceOperationEntry) => {
    setIfAbsent(sequenceOperationsRef.current, entry.sequenceActionId, {
      action: entry.action,
      keys: entry.keys,
      timeout: entry.timeout,
    }, `[Ink-Cartridge] Sequence Action ${entry.sequenceActionId} may not be defined repeatedly`);
  }, []);

  const hasSequenceAction = useCallback((sequenceActionId: string): boolean => {
    return sequenceOperationsRef.current.has(sequenceActionId);
  }, []);

  const removeSequenceAction = useCallback((sequenceActionId: string) => {
    deleteIfPresent(sequenceOperationsRef.current, sequenceActionId, `[Ink-Cartridge] Cannot remove sequence action "${sequenceActionId}": action not registered.`);
  }, []);

  const clearSequenceOperations = useCallback(() => {
    sequenceOperationsRef.current.clear();
  }, []);

  const addAction = useCallback((entry: ShortcutOperationEntry) => {
    setIfAbsent(shortcutOperationsRef.current, entry.actionId, {
      action: entry.action,
      keys: entry.keys,
    }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${entry.actionId}`);
  }, []);

  const hasAction = useCallback((actionId: string): boolean => {
    return shortcutOperationsRef.current.has(actionId);
  }, []);

  const removeAction = useCallback((actionId: string) => {
    deleteIfPresent(shortcutOperationsRef.current, actionId, `[Ink-Cartridge] Cannot remove action "${actionId}": action not registered.`);
  }, []);

  const clearShortcutOperations = useCallback(() => {
    shortcutOperationsRef.current.clear();
  }, []);

  return {
    globalKeys,
    getGlobalKeys,
    globalSequence,
    getGlobalSequences,
    getGlobalPendingSequence,
    defineShortcutAction,
    addAction,
    hasAction,
    removeAction,
    modifyAction,
    clearShortcutOperations,
    defineSequenceAction,
    addSequenceAction,
    hasSequenceAction,
    removeSequenceAction,
    modifySequenceAction,
    clearSequenceOperations,
  };
}
