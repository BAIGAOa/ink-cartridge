import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useInput } from 'ink';
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
import type { KeyboardProcessorProps } from '@cartridge-engine/keyboard-engine';
import { clearShortcutOperations } from '@cartridge-engine/keyboard-engine';
import { KeyboardContext } from '../context.js';
import { useScreenSystem } from '../../screen/hook.js';
import { normalizeKeyNames } from '../keyNormalizer.js';

export interface KeyboardProviderProps {
  children: ReactNode;
  processors?: KeyboardProcessorProps[]
  modes?: string[];
  defaultMode?: string | null;
}

export function KeyboardProvider({ children, processors, modes, defaultMode }: KeyboardProviderProps) {
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
    });
  }
  const engine = engineRef.current;

  engine.sync({
    path: currentPath,
    activeOverlayIds,
    displayedOverlays: displayedOverlays.map(o => ({ id: o.id })),
    activeModalId,
    displayedModals: displayedModals.map(m => ({ id: m.id })),
  });

  useEffect(() => { engine.cleanLayers(); }, [currentPath, engine]);
  useEffect(() => { engine.cleanOverlayLayers(); }, [displayedOverlays, engine]);
  useEffect(() => { engine.cleanModalLayers(); }, [displayedModals, engine]);

  const value = useMemo(
    () => ({
      boundKeyboard: engine.boundKeyboard.bind(engine) as any,
      penetration: engine.penetration.bind(engine),
      stop: engine.stop.bind(engine),
      globalKeys: engine.globalKeys.bind(engine),
      getGlobalKeys: engine.getGlobalKeys.bind(engine),
      globalSequence: engine.globalSequence.bind(engine),
      getGlobalSequences: engine.getGlobalSequences.bind(engine),
      getGlobalPendingSequence: engine.getGlobalPendingSequence.bind(engine),
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
