import { useContext, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { measureElement, useBoxMetrics, useWindowSize, type DOMElement } from "ink";
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
  MouseRegionCallbacks,
  MouseRegionRect,
} from "@cartridge-engine/keyboard-engine";
import { ROOT_MOUSE_LAYER_ID } from "@cartridge-engine/keyboard-engine";

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

/**
 * Convert an Ink DOM element's measured layout metrics into the 1-based
 * terminal coordinate space used by mouse events.
 *
 * Assumes the live region starts at the terminal top-left (no viewport
 * offset) — true for full-screen apps. If content can be scrolled or offset,
 * the caller must account for the viewport position.
 */
function measureRegion(node: DOMElement): MouseRegionRect {
  const m = measureElement(node);
  return { x: m.x + 1, y: m.y + 1, width: m.width, height: m.height };
}

/**
 * Walk up to the `ink-root` DOM node. Ink's layout listeners are registered
 * on the root node, which is also where `useBoxMetrics` attaches them.
 */
function findRootNode(node: DOMElement | null): DOMElement | undefined {
  if (!node) return undefined;
  if (!node.parentNode) return node.nodeName === "ink-root" ? node : undefined;
  return findRootNode(node.parentNode);
}

/**
 * Register an Ink element as a mouse region.
 *
 * Attach the returned ref to a `<Box>`. The engine hit-tests xterm-mouse
 * events against the element's measured rectangle and fires the callbacks:
 * `onClick` for clicks, `onWheel` for wheel events, `onEnter`/`onLeave` for
 * hover transitions.
 *
 * The region is attributed to the surrounding layer/modal layer
 * automatically (same layer scoping as {@link useKeyboard}); outside any layer
 * it registers on the shared root layer, hit-tested last.
 *
 * The rect is re-measured and re-registered after every render, so layout
 * changes (resize, content growth) stay in sync with the engine.
 *
 * Must be used inside a {@link KeyboardProvider} with `mouse` enabled.
 *
 * @param callbacks - Region callbacks (kept fresh across renders).
 * @param options   - Optional `regionId` (defaults to an auto-generated
 *                    unique id — pass one to control identity, e.g. for
 *                    drag/hover bookkeeping), explicit `layerId` override,
 *                    and hit-test `priority` (higher wins on overlap;
 *                    defaults 0).
 * @returns A ref to attach to the Ink `<Box>` to track.
 *
 * @example
 * ```tsx
 * const boxRef = useMouseRegion({
 *   onClick: (event, rect) => {
 *     const col = event.x - rect.x - 1; // local cell column (1-cell border)
 *     console.log(`Clicked cell ${col} at ${event.x},${event.y}`);
 *   },
 *   onEnter: () => setIsHovered(true),
 *   onLeave: () => setIsHovered(false),
 * });
 * return <Box ref={boxRef}>…</Box>;
 * ```
 */
export function useMouseRegion(
  callbacks: MouseRegionCallbacks,
  options?: { layerId?: string; regionId?: string; priority?: number },
): RefObject<DOMElement | null> {
  const ctx = useContext(KeyboardContext);
  const layerCtx = useContext(LayerElementContext);
  const modalCtx = useContext(ModalLayerElementContext);
  const ref = useRef<DOMElement | null>(null);
  const autoId = useId();

  // Ink's terminal-resize path only re-lays-out and redraws the yoga tree —
  // it does NOT re-render React components. A region's rect is refreshed
  // during render below, which needs a render to run, so without this a
  // static layout (e.g. a centered menu) keeps a stale rect after a resize.
  // Tracking the layout metrics forces this component to re-render on layout
  // commits, which re-measures and re-registers the rect synchronously below.
  useBoxMetrics(ref);

  // `useBoxMetrics` only fires when the element's OWN relative metrics change
  // (`getComputedLayout()` vs. its parent). A button inside a fixed-width,
  // centered row keeps identical relative metrics after a resize while its
  // absolute screen position moves — so no re-render, and the stale rect
  // stays registered until any mouse hit happens to re-render the component.
  // Subscribing to terminal resize re-renders unconditionally, so the
  // re-measure below always runs with the fresh layout.
  useWindowSize();

  const layerId =
    options?.layerId ??
    layerCtx?.layer.layerId ??
    modalCtx?.modalLayer.layerId ??
    ROOT_MOUSE_LAYER_ID;
  // Region identity is NOT the surrounding layer/modal element id — reusing
  // that id would collide for every region in the same layer/modal (the
  // later registration overwrites the earlier one). Default to a unique id
  // per call site; callers pass `regionId` to control identity explicitly.
  const regionId = options?.regionId ?? `mouse:${autoId}`;

  // Register synchronously during render so the engine never holds a rect
  // from a previous frame: a resize re-renders this component (via
  // useBoxMetrics above) and this runs with the fresh layout — no effect
  // timing gap. Overwrite is idempotent: it preserves registration order
  // and does NOT touch hover/drag state, essential so a dragging window
  // can re-render mid-drag. The first render has no ref node yet; the
  // metrics update right after mount forces a second render that registers.
  const node = ref.current;
  if (node && ctx) {
    ctx.registerMouseRegion({
      layerId,
      regionId,
      rect: measureRegion(node),
      callbacks,
      priority: options?.priority,
    });
  }

  // A region's rect is only re-measured when this component re-renders, but
  // two common re-layouts never trigger that: React skips children whose
  // element reference is unchanged (a draggable frame moving its children),
  // and `useBoxMetrics` only fires when the element's OWN relative metrics
  // change (an element inside a moved ancestor keeps identical relative
  // metrics). The stale rect then wins hit-testing at the old position.
  // Ink fires root layout listeners after every commit (`emitLayoutListeners`
  // in the reconciler's `resetAfterCommit`, once the yoga layout is applied),
  // so subscribe here and re-measure unconditionally — no render needed.
  // `addLayoutListener` is not exported from ink's public entry, so touch the
  // same internal listener set it uses (`internal_layoutListeners`); ink
  // itself iterates it, and `useBoxMetrics` depends on the identical hook.
  useEffect(() => {
    const rootNode = findRootNode(ref.current);
    if (!rootNode) return;
    type LayoutListenerHost = DOMElement & {
      internal_layoutListeners?: Set<() => void>;
    };
    const host = rootNode as LayoutListenerHost;
    const listener = () => {
      const current = ref.current;
      if (current && ctx) {
        ctx.registerMouseRegion({
          layerId,
          regionId,
          rect: measureRegion(current),
          callbacks,
          priority: options?.priority,
        });
      }
    };
    host.internal_layoutListeners ??= new Set();
    host.internal_layoutListeners.add(listener);
    return () => {
      host.internal_layoutListeners?.delete(listener);
    };
  });

  // Unmount cleanup: only runs when the component truly unmounts (or
  // layerId/regionId change), never on plain re-renders — those overwrite
  // the registration above.
  useEffect(() => {
    return () => {
      ctx?.unregisterMouseRegion(layerId, regionId);
    };
  }, [ctx, layerId, regionId]);

  return ref;
}
