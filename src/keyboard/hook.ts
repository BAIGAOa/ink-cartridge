import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardContext, KeyboardContextValue } from "./context.js";
import { LayerElementContext } from "../screen/LayerElementContext.js";
import { ModalLayerElementContext } from "../screen/ModalLayerElementContext.js";
import type {
  AllowModalOptions,
  BoundKeyboardOptions,
  KeyHandler,
  ModalMissCallback,
  ModalMissOptions,
  PenetrationOptions,
  SequenceOptions,
  StopOptions,
  FocusSetOptions,
} from "@cartridge-engine/keyboard-engine";

/**
 * Access the keyboard API from within a React component.
 *
 * Bindings are scoped to the current layer element automatically. When this
 * hook is called inside a layer/modal element, the element's own layer id is
 * pushed onto the engine owner stack so bindings are attributed to that
 * layer even when it is not the top layer.
 *
 * Must be used inside a {@link KeyboardProvider}.
 *
 * @throws If no provider is found in the component tree.
 */
export function useKeyboard(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  const layerCtx = useContext(LayerElementContext);
  const modalCtx = useContext(ModalLayerElementContext);
  if (!ctx) {
    throw new Error(
      "[Ink-Cartridge] useKeyboard() must be called inside a <KeyboardProvider>.",
    );
  }

  const ownerId =
    layerCtx?.layer.layerId ?? modalCtx?.modalLayer.layerId ?? null;
  const elementId = layerCtx?.id ?? modalCtx?.id;
  const { _pushOwner, _popOwner } = ctx;
  const ownerPushedRef = useRef(false);

  useEffect(() => {
    if (!ownerId) return;
    if (!ownerPushedRef.current) {
      _pushOwner(ownerId);
      ownerPushedRef.current = true;
    }
    return () => {
      _popOwner(ownerId);
      ownerPushedRef.current = false;
    };
  }, [_popOwner, _pushOwner, ownerId]);

  const wrapped = useMemo<KeyboardContextValue>(() => {
    const withElement = <T extends { elementId?: string }>(
      options?: T,
    ): T | undefined => {
      if (!elementId) return options;
      if (!options) return { elementId } as T;
      if (options.elementId) return options;
      return { ...options, elementId };
    };

    const withFocusOptions = (
      groupOrOptions?: string | FocusSetOptions,
    ): string | FocusSetOptions | undefined => {
      if (!elementId) return groupOrOptions;
      if (typeof groupOrOptions === "string") return groupOrOptions;
      return {
        ...groupOrOptions,
        element: groupOrOptions?.element ?? elementId,
      };
    };

    const boundKeyboard = ((
      keysOrActionId: string | string[],
      handlerOrOptions: KeyHandler | string | BoundKeyboardOptions,
      maybeOptions?: BoundKeyboardOptions,
    ) => {
      if (
        typeof keysOrActionId === "string" &&
        typeof handlerOrOptions !== "function" &&
        typeof handlerOrOptions !== "string"
      ) {
        return ctx.boundKeyboard(keysOrActionId, withElement(handlerOrOptions));
      }
      if (typeof handlerOrOptions === "string") {
        return ctx.boundKeyboard(
          keysOrActionId,
          handlerOrOptions,
          withElement(maybeOptions),
        );
      }
      return ctx.boundKeyboard(
        keysOrActionId,
        handlerOrOptions as KeyHandler,
        withElement(maybeOptions),
      );
    }) as KeyboardContextValue["boundKeyboard"];

    const boundSequence = ((
      keysOrActionId: string | string[],
      handlerOrOptions?: KeyHandler | SequenceOptions,
      maybeOptions?: SequenceOptions,
    ) => {
      if (
        typeof keysOrActionId === "string" &&
        (typeof handlerOrOptions === "undefined" ||
          typeof handlerOrOptions === "object")
      ) {
        return ctx.boundSequence(
          keysOrActionId,
          withElement(handlerOrOptions as SequenceOptions | undefined),
        );
      }
      return ctx.boundSequence(
        keysOrActionId,
        handlerOrOptions as KeyHandler,
        withElement(maybeOptions),
      );
    }) as KeyboardContextValue["boundSequence"];

    return {
      ...ctx,
      boundKeyboard,
      penetration: (keys: string[], options?: PenetrationOptions) =>
        ctx.penetration(keys, withElement(options)),
      stop: (keys: string[], options?: StopOptions) =>
        ctx.stop(keys, withElement(options)),
      allowModal: (keys: string[], options?: AllowModalOptions) =>
        ctx.allowModal(keys, withElement(options)),
      boundSequence,
      useModalMissListener: (
        cb: ModalMissCallback,
        options?: ModalMissOptions,
      ) => ctx.useModalMissListener(cb, withElement(options)),
      focusSet: (focusId: string, groupOrOptions?: string | FocusSetOptions) =>
        ctx.focusSet(focusId, withFocusOptions(groupOrOptions)),
      focusNext: (groupOrOptions?: string | FocusSetOptions) =>
        ctx.focusNext(withFocusOptions(groupOrOptions)),
      focusPrev: (groupOrOptions?: string | FocusSetOptions) =>
        ctx.focusPrev(withFocusOptions(groupOrOptions)),
      focusCurrent: (groupOrOptions?: string | FocusSetOptions) =>
        ctx.focusCurrent(withFocusOptions(groupOrOptions)),
      focusUnregister: (
        focusId: string,
        groupOrOptions?: string | FocusSetOptions,
      ) => ctx.focusUnregister(focusId, withFocusOptions(groupOrOptions)),
      activateFocusGroup: (
        focusId: string,
        groupOrOptions?: string | FocusSetOptions,
      ) => ctx.activateFocusGroup(focusId, withFocusOptions(groupOrOptions)),
      kickFocusGroup: (groupOrOptions?: string | FocusSetOptions) =>
        ctx.kickFocusGroup(withFocusOptions(groupOrOptions)),
    };
  }, [ctx, elementId]);

  return wrapped;
}

export function useFocusState(
  focusId: string,
  groupOrOptions?: string | FocusSetOptions,
): boolean {
  const { focusCurrent, subscribeFocus } = useKeyboard();
  const [isFocused, setIsFocused] = useState<boolean>(
    () => focusCurrent(groupOrOptions).result?.id === focusId,
  );

  useEffect(() => {
    return subscribeFocus(() => {
      setIsFocused(focusCurrent(groupOrOptions).result?.id === focusId);
    });
  }, [focusId, focusCurrent, subscribeFocus, groupOrOptions]);

  return isFocused;
}

export function useModalMissListener(
  cb: ModalMissCallback,
  options?: ModalMissOptions,
): () => void {
  const ctx = useContext(KeyboardContext);
  const modalCtx = useContext(ModalLayerElementContext);
  const modalId = modalCtx?.id ?? null;

  useEffect(() => {
    if (!ctx || !modalId) return;
    const unsub = ctx.useModalMissListener(cb, {
      ...options,
      elementId: modalId,
    });
    return unsub;
  }, [ctx, modalId, cb, options]);

  return () => {};
}
