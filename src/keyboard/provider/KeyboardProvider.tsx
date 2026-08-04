import React, {
  ComponentType,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useInput } from "ink";
import { KeyboardEngine } from "@cartridge-engine/keyboard-engine";
import type {
  KeyboardLayer,
  KeyboardProcessorProps,
  ValueSchema,
} from "@cartridge-engine/keyboard-engine";
import {
  clearShortcutOperations,
  Mouse,
  type MouseOptions,
  type XtermMouseEvent,
} from "@cartridge-engine/keyboard-engine";
import { KeyboardContext, KeyboardContextValue } from "../context.js";
import { useScreenSystem } from "../../screen/hook.js";
import { isInkSpecialKey, normalizeKeyNames } from "../keyNormalizer.js";
import type {
  Layer,
  ModalLayer,
} from "../../screen/types/layer.js";

function toKeyboardLayerState(
  layers: Array<Layer | ModalLayer>,
  currentPath?: React.ComponentType<any>[],
): KeyboardLayer[] {
  return layers.map((layer) => {
    const hostPage = (layer as any).hostPage as React.ComponentType<any> | undefined;
    const auto = (layer as any).automaticTakeoverKeyboard as boolean | undefined;
    // When auto takeover is enabled and we're not on the host page,
    // exclude all elements from activeElements so the layer's bindings
    // are dormant until returning to the host page.
    const awayFromHost =
      auto &&
      hostPage &&
      currentPath &&
      currentPath.length > 0 &&
      currentPath[currentPath.length - 1] !== hostPage;

    return {
      layerId: layer.layerId,
      elements: Array.from(layer.elements.keys()),
      activeElements: awayFromHost
        ? []
        : Array.from(layer.elements.entries())
            .filter(([, element]) => element.active !== false)
            .map(([id]) => id),
    };
  });
}

export interface KeyboardProviderProps {
  children: ReactNode;

  /**
   * Here you can pre-insert the custom processors you want,
   * and they will be inserted into the pipeline based on their index and ID.
   * @example
   * ```tsx
   * <KeyboardProvider
   *   processors={[
   *     { id: "uppercase", index: 0, processor: MyUppercaseProcessor },
   *     { id: "logger", index: 1, processor: MyLoggerProcessor },
   *   ]}
   * >
   * ```
   *
   */
  processors?: KeyboardProcessorProps<ComponentType<any>>[];

  /**
   * Please enter the mode flag you wish to register directly.
   *
   * @example
   * ```tsx
   * <KeyboardProvider modes={["insert", "editor"]}>
   * ```
   */
  modes?: string[];

  /**
   * The default mode must be pre-registered in the modes list.
   */
  defaultMode?: string | null;

  /**
   * Optional runtime type schema for composition chain value validatio
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

  /**
   * After enabling this option,
   * the system will automatically listen for mouse events.
   */
  mouse?: boolean;

  /**
   * Options passed to the internal xterm-mouse `Mouse` instance when `mouse`
   * is enabled. See `MouseOptions` (e.g. `clickDistanceThreshold`,
   * `pressStormThreshold`, `degradedDedupDistance`).
   */
  mouseOptions?: MouseOptions;
}

export function KeyboardProvider({
  children,
  processors,
  modes,
  defaultMode,
  valueSchema,
  autoTab,
  mouse,
  mouseOptions,
}: KeyboardProviderProps) {
  const {
    currentPath,
    allLayers,
    allModalLayers,
  } = useScreenSystem();

  const engineRef = useRef<KeyboardEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new KeyboardEngine({
      modes,
      defaultMode: defaultMode ?? undefined,
      processors,
      normalizeKeyNames,
      isNormalChar: isInkSpecialKey,
      valueSchema,
      autoTab,
    });
  }
  const engine = engineRef.current;

  engine.sync({
    pagePath: currentPath,
    layers: toKeyboardLayerState(allLayers, currentPath),
    modalLayers: toKeyboardLayerState(allModalLayers, currentPath),
  });

  useEffect(() => {
    engine.cleanLayers();
  }, [currentPath, engine]);
  useEffect(() => {
    engine.cleanOverlayLayers();
  }, [allLayers, engine]);
  useEffect(() => {
    engine.cleanModalLayers();
  }, [allModalLayers, engine]);

  // Mouse event feed: when `mouse` is enabled, listen with xterm-mouse and
  // push events into the engine's mouse region hit-testing.
  useEffect(() => {
    if (!mouse) return;
    if (!Mouse.isSupported()) {
      console.warn(
        "[ink-cartridge] Mouse tracking requires a TTY input stream — mouse events disabled.",
      );
      return;
    }
    const mouseInstance = new Mouse(mouseOptions);
    try {
      mouseInstance.enable();
    } catch (err) {
      console.warn(
        "[ink-cartridge] Failed to enable mouse tracking:",
        err instanceof Error ? err.message : err,
      );
      return;
    }
    const handle = (event: XtermMouseEvent): void => {
      engine.processMouseEvent(event);
    };
    mouseInstance.on("click", handle);
    mouseInstance.on("move", handle);
    mouseInstance.on("press", handle);
    mouseInstance.on("drag", handle);
    mouseInstance.on("release", handle);
    return () => {
      mouseInstance.off("click", handle);
      mouseInstance.off("move", handle);
      mouseInstance.off("press", handle);
      mouseInstance.off("drag", handle);
      mouseInstance.off("release", handle);
      mouseInstance.destroy();
    };
  }, [mouse, engine, mouseOptions]);

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
      registerMouseRegion: engine.registerMouseRegion.bind(engine),
      unregisterMouseRegion: engine.unregisterMouseRegion.bind(engine),
      getHoveredMouseRegion: engine.getHoveredMouseRegion.bind(engine),
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
