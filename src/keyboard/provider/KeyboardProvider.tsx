import React, { ReactNode, useMemo } from 'react';
import { useInput } from 'ink';
import { KeyboardContext } from '../context.js';
import { KeyboardProcessorProps } from '../types.js';
import { useScreenSystem } from '../../screen/hook.js';
import { buildPipelineContext } from '../pipeline/index.js';
import { runPipeline } from '../pipeline/index.js';
import { useKeyboardState } from './useKeyboardState.js';
import { useKeyboardBindings } from './useKeyboardBindings.js';
import { useKeyboardRegistry } from './useKeyboardRegistry.js';

export interface KeyboardProviderProps {
  children: ReactNode;
  /** Per-instance custom processors injected into the event pipeline. */
  processors?: KeyboardProcessorProps[]
  /**
   * Initial set of mode names (e.g. `["normal", "insert"]`).
   * Modes must be registered before they can be activated via
   * {@link KeyboardContextValue.setMode}. Use {@link KeyboardContextValue.addMode}
   * to register additional modes at runtime.
   */
  modes?: string[];
  /**
   * The active mode on mount. Must be a member of `modes` or `null`
   * (no-mode). Defaults to `null`.
   */
  defaultMode?: string | null;
}

/**
 * Keyboard context provider for layered key handling.
 *
 * Manages per-screen-layer key bindings, transparent keys (`penetration`),
 * key-stop propagation barriers (`stop`), and global keys (`globalKeys`).
 * Handles the full event priority chain:
 *   1. Global keys with `affectOverlay: true`
 *   2. Broadcast to all active overlays (sorted by zIndex ascending)
 *   3. Global keys with `affectOverlay: false` (default)
 *   4. Screen stack (top → bottom), only if no overlay consumed the event
 *   5. Drop unhandled keys
 *
 * Must be nested inside a {@link ScenarioManagementProvider} so that the
 * current screen path and overlay state are available.
 */
export function KeyboardProvider({ children, processors, modes, defaultMode }: KeyboardProviderProps) {
  const {
    currentPath,
    activeOverlayIds,
    displayedOverlays,
    activeModalId,
    displayedModals,
  } = useScreenSystem();

  const state = useKeyboardState(
    { currentPath, activeOverlayIds, displayedOverlays, activeModalId, displayedModals },
    modes,
    defaultMode,
  );

  const bindings = useKeyboardBindings({
    getCurrentOwner: state.getCurrentOwner,
    getLayer: state.getLayer,
    getOrCreateFocusTarget: state.getOrCreateFocusTarget,
    globalKeysRef: state.refs.globalKeysRef,
    shortcutOperationsRef: state.refs.shortcutOperationsRef,
    sequenceOperationsRef: state.refs.sequenceOperationsRef,
    globalSequencesRef: state.refs.globalSequencesRef,
    getCurrentMode: state.getCurrentMode,
  });

  const registry = useKeyboardRegistry({
    globalKeysRef: state.refs.globalKeysRef,
    globalSequencesRef: state.refs.globalSequencesRef,
    globalPendingSeqRef: state.refs.globalPendingSeqRef,
    shortcutOperationsRef: state.refs.shortcutOperationsRef,
    sequenceOperationsRef: state.refs.sequenceOperationsRef,
  });

  const value = useMemo(
    () => ({
      boundKeyboard: bindings.boundKeyboard,
      penetration: bindings.penetration,
      stop: bindings.stop,
      globalKeys: registry.globalKeys,
      getGlobalKeys: registry.getGlobalKeys,
      globalSequence: registry.globalSequence,
      getGlobalSequences: registry.getGlobalSequences,
      getGlobalPendingSequence: registry.getGlobalPendingSequence,
      focusSet: state.focusSet,
      focusNext: state.focusNext,
      focusPrev: state.focusPrev,
      focusCurrent: state.focusCurrent,
      focusUnregister: state.focusUnregister,
      subscribeFocus: state.subscribeFocus,
      defineShortcutAction: registry.defineShortcutAction,
      addAction: registry.addAction,
      hasAction: registry.hasAction,
      removeAction: registry.removeAction,
      modifyAction: registry.modifyAction,
      clearShortcutOperations: registry.clearShortcutOperations,
      defineSequenceAction: registry.defineSequenceAction,
      addSequenceAction: registry.addSequenceAction,
      hasSequenceAction: registry.hasSequenceAction,
      removeSequenceAction: registry.removeSequenceAction,
      modifySequenceAction: registry.modifySequenceAction,
      clearSequenceOperations: registry.clearSequenceOperations,
      _pushOwner: state.pushOwner,
      _popOwner: state.popOwner,
      boundSequence: bindings.boundSequence,
      enableWildcardPriority: state.enableWildcardPriority,
      useModalMissListener: bindings.useModalMissListener,
      allowModal: bindings.allowModal,
      readLayer: state.readLayer,
      getCurrentMode: state.getCurrentMode,
      addMode: state.addMode,
      removeMode: state.removeMode,
      setMode: state.setMode,
      nextMode: state.nextMode,
      prevMode: state.prevMode,
      addCondition: state.addCondition,
      setCondition: state.setCondition,
      removeCondition: state.removeCondition,
    }),
    [
      bindings, registry,
      state.focusSet, state.focusNext, state.focusPrev, state.focusCurrent,
      state.focusUnregister, state.subscribeFocus, state.pushOwner, state.popOwner,
      state.enableWildcardPriority, state.readLayer, state.getCurrentMode,
      state.addMode, state.removeMode, state.setMode, state.nextMode, state.prevMode,
      state.addCondition, state.setCondition, state.removeCondition,
    ],
  );

  useInput((input, key) => {
    const ctx = buildPipelineContext(input, key, {
      pathRef: state.refs.pathRef,
      globalKeysRef: state.refs.globalKeysRef,
      globalSequencesRef: state.refs.globalSequencesRef,
      activeOverlayIdsRef: state.refs.activeOverlayIdsRef,
      displayedOverlaysRef: state.refs.displayedOverlaysRef,
      activeModalIdRef: state.refs.activeModalIdRef,
      layersRef: state.refs.layersRef,
      globalPendingSeqRef: state.refs.globalPendingSeqRef,
      wildcardPriorityCountRef: state.refs.wildcardPriorityCountRef,
      notifyFocusChange: state.notifyFocusChange,
      currentModeRef: state.refs.currentModeRef,
      conditions: state.refs.conditions,
    });

    runPipeline(ctx, processors);
  });

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}
