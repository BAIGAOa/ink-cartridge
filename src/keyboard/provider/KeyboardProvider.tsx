import React, { ComponentType, ReactNode, useEffect, useMemo, useRef } from "react";
import { useInput } from "ink";
import { KeyboardEngine } from "@cartridge-engine/keyboard-engine";
import type {
  KeyboardProcessorProps,
  ValueSchema,
} from "@cartridge-engine/keyboard-engine";
import { clearShortcutOperations } from "@cartridge-engine/keyboard-engine";
import { KeyboardContext, KeyboardContextValue } from "../context.js";
import { useScreenSystem } from "../../screen/hook.js";
import { normalizeKeyNames } from "../keyNormalizer.js";

export interface KeyboardProviderProps {
  children: ReactNode;
  processors?: KeyboardProcessorProps<ComponentType<any>>[];
  modes?: string[];
  defaultMode?: string | null;
  /**
   * Optional runtime type schema for composition chain value validation.
   *
   * @example
   * ```tsx
   * <KeyboardProvider valueSchema={{
   *   times: (v): v is number => typeof v === 'number',
   *   action: (v): v is number => typeof v === 'number',
   * }}>
   * ```
   */
  valueSchema?: ValueSchema;
  /**
   * Whether the engine automatically handles Tab / Shift+Tab for focus
   * rotation. Defaults to `false`.
   *
   * When `true`, the engine intercepts Tab/Shift+Tab and cycles focus
   * automatically. When `false` or omitted, developers must call
   * `focusNext` / `focusPrev` manually.
   */
  autoTab?: boolean;
}

export function KeyboardProvider({
  children,
  processors,
  modes,
  defaultMode,
  valueSchema,
  autoTab,
}: KeyboardProviderProps) {
  const {
    currentPath,
    activeOverlayIds,
    displayedOverlays,
    activeModalId,
    displayedModals,
  } = useScreenSystem();

  const engineRef = useRef<KeyboardEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new KeyboardEngine({
      modes,
      defaultMode: defaultMode ?? undefined,
      processors,
      normalizeKeyNames,
      valueSchema,
      autoTab,
    });
  }
  const engine = engineRef.current;

  engine.sync({
    path: currentPath,
    activeOverlayIds,
    displayedOverlays: displayedOverlays.map((o) => ({ id: o.id })),
    activeModalId,
    displayedModals: displayedModals.map((m) => ({ id: m.id })),
  });

  useEffect(() => {
    engine.cleanLayers();
  }, [currentPath, engine]);
  useEffect(() => {
    engine.cleanOverlayLayers();
  }, [displayedOverlays, engine]);
  useEffect(() => {
    engine.cleanModalLayers();
  }, [displayedModals, engine]);

  const value: KeyboardContextValue = useMemo(
    () => ({
      boundKeyboard: engine.boundKeyboard.bind(engine) as any,
      penetration: engine.penetration.bind(engine),
      stop: engine.stop.bind(engine),
      globalKeys: engine.globalKeys.bind(engine),
      getGlobalKeys: engine.getGlobalKeys.bind(engine),
      globalSequence: engine.globalSequence.bind(engine),
      getGlobalSequences: engine.getGlobalSequences.bind(engine),
      getGlobalPendingSequence: engine.getGlobalPendingSequence.bind(engine),
      thereGlobalQueueWaiting: engine.thereGlobalQueueWaiting.bind(engine),
      currentScreenHasSequenceWaiting:
        engine.currentScreenHasSequenceWaiting.bind(engine),
      focusSet: engine.focusSet.bind(engine),
      focusNext: engine.focusNext.bind(engine),
      focusPrev: engine.focusPrev.bind(engine),
      focusCurrent: engine.focusCurrent.bind(engine),
      focusUnregister: engine.focusUnregister.bind(engine),
      subscribeFocus: engine.subscribeFocus.bind(engine),
      defineShortcutAction: engine.defineShortcutAction.bind(engine),
      addAction: engine.addAction.bind(engine),
      hasAction: engine.hasAction.bind(engine),
      removeAction: engine.removeAction.bind(engine),
      modifyAction: engine.modifyAction.bind(engine),
      clearShortcutOperations: engine.clearShortcutOperations.bind(engine),
      defineSequenceAction: engine.defineSequenceAction.bind(engine),
      addSequenceAction: engine.addSequenceAction.bind(engine),
      hasSequenceAction: engine.hasSequenceAction.bind(engine),
      removeSequenceAction: engine.removeSequenceAction.bind(engine),
      modifySequenceAction: engine.modifySequenceAction.bind(engine),
      clearSequenceOperations: engine.clearSequenceOperations.bind(engine),
      _pushOwner: engine.pushOwner.bind(engine),
      _popOwner: engine.popOwner.bind(engine),
      boundSequence: engine.boundSequence.bind(engine) as any,
      enableWildcardPriority: engine.enableWildcardPriority.bind(engine),
      useModalMissListener: engine.useModalMissListener.bind(engine),
      allowModal: engine.allowModal.bind(engine),
      readLayer: engine.readLayer.bind(engine),
      getCurrentMode: engine.getCurrentMode.bind(engine),
      addMode: engine.addMode.bind(engine),
      removeMode: engine.removeMode.bind(engine),
      setMode: engine.setMode.bind(engine),
      nextMode: engine.nextMode.bind(engine),
      prevMode: engine.prevMode.bind(engine),
      addCondition: engine.addCondition.bind(engine),
      setCondition: engine.setCondition.bind(engine),
      removeCondition: engine.removeCondition.bind(engine),
      addProcessor: engine.addProcessor.bind(engine),
      removeProcessor: engine.removeProcessor.bind(engine),
      getProcessors: engine.getProcessors.bind(engine),
      resetProcessors: engine.resetProcessors.bind(engine),
      registryCompositionKey: engine.registryCompositionKey.bind(engine),
      removeCompositionKey: engine.removeCompositionKey.bind(engine),
      clearAllCompositionKeys: engine.clearAllCompositionKeys.bind(engine),
      hasPendingComposition: engine.hasPendingComposition.bind(engine),
      getCompositionContext: engine.getCompositionContext.bind(engine),
      abortComposition: engine.abortComposition.bind(engine),
      updateCompositionKey: engine.updateCompositionKey.bind(engine),
      setValueSchema: engine.setValueSchema.bind(engine),
      undoComposition: engine.undoComposition.bind(engine),
      bufferedCompositionCount: engine.bufferedCompositionCount.bind(engine),
      clearCompositionBuffers: engine.clearCompositionBuffers.bind(engine),
      subscribeComposition: engine.subscribeComposition.bind(engine),
      getLastCompositionEvent: engine.getLastCompositionEvent.bind(engine),
      addMapping: engine.addMapping.bind(engine),
      removeMappingKey: engine.removeMappingKey.bind(engine),
      removeMapping: engine.removeMapping.bind(engine),
      subscribeMapping: engine.subscribeMapping.bind(engine),
      getLastMappingEvent: engine.getLastMappingEvent.bind(engine),
      activateFocusGroup: engine.activateFocusGroup.bind(engine),
      kickFocusGroup: engine.kickFocusGroup.bind(engine),
      kickProcessor: engine.kickProcessor.bind(engine),
      activeProcessor: engine.activeProcessor.bind(engine),
    }),
    [engine],
  );

  useInput((input, key) => {
    engine.processKey(input, key);
  });

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}

export { clearShortcutOperations };
