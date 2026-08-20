import { describe, expect, it, vi } from "vitest";
import { createEngine, makeSyncLayer } from "../_helpers/factories.js";
import type { MouseRegionRect } from "../../src/types/mouse-region.js";
import type { MouseEvent as XtermMouseEvent } from "../../src/xterm-mouse/types/index.js";

// Mimics the stacked-modal scenario in packages/editor/src/test.tsx: several
// modal layers open on top of each other at offset positions, each with a
// body region and a clickable Cancel button (priority 1, like ModalButton).
// Regression: only the TOPMOST modal layer may receive mouse events — lower
// modals must stay silent even where they are still visible on screen.
const MODALS = [
  { layerId: "low", top: 0, left: 80 },
  { layerId: "middle", top: 4, left: 70 },
  { layerId: "top", top: 8, left: 60 },
] as const;

function bodyRect(modal: (typeof MODALS)[number]): MouseRegionRect {
  return { x: modal.left, y: modal.top, width: 46, height: 8 };
}

/** Cancel button, right-aligned inside the body like test.tsx's ModalButton. */
function buttonRect(modal: (typeof MODALS)[number]): MouseRegionRect {
  return { x: modal.left + 36, y: modal.top + 5, width: 8, height: 3 };
}

/** (x, y) inside the MIDDLE modal's Cancel button, outside every top-modal region. */
const MIDDLE_BUTTON_POINT = { x: 110, y: 10 };
/** (x, y) inside the TOP modal's Cancel button (also inside its body). */
const TOP_BUTTON_POINT = { x: 100, y: 14 };

function makeEvent(
  partial: Partial<XtermMouseEvent> & { action: XtermMouseEvent["action"] },
): XtermMouseEvent {
  return {
    x: 1,
    y: 1,
    button: "left",
    shift: false,
    alt: false,
    ctrl: false,
    raw: 0,
    data: "",
    protocol: "SGR",
    ...partial,
  };
}

type Engine = ReturnType<typeof createEngine>;

function registerModal(
  engine: Engine,
  modal: (typeof MODALS)[number],
  callbacks: { onBody?: () => void; onCancel?: () => void },
): void {
  engine.registerMouseRegion({
    layerId: modal.layerId,
    regionId: "body",
    rect: bodyRect(modal),
    callbacks: { onClick: callbacks.onBody },
  });
  engine.registerMouseRegion({
    layerId: modal.layerId,
    regionId: "cancel",
    rect: buttonRect(modal),
    callbacks: { onClick: callbacks.onCancel },
    priority: 1,
  });
}

function syncModals(
  engine: Engine,
  open: readonly string[],
  layers: readonly string[] = [],
): void {
  engine.sync({
    pagePath: [{}],
    layers: layers.map((id) => makeSyncLayer(id, [])),
    modalLayers: MODALS.filter((m) => open.includes(m.layerId)).map((m) =>
      makeSyncLayer(m.layerId, []),
    ),
  });
}

describe("stacked modal layers", () => {
  it("only the topmost modal receives clicks; lower modals stay silent", () => {
    const engine = createEngine();
    const clicks: Record<string, () => void> = {};
    for (const modal of MODALS) {
      clicks[`${modal.layerId}-body`] = vi.fn<() => void>();
      clicks[`${modal.layerId}-cancel`] = vi.fn<() => void>();
      registerModal(engine, modal, {
        onBody: clicks[`${modal.layerId}-body`],
        onCancel: clicks[`${modal.layerId}-cancel`],
      });
    }
    syncModals(engine, ["low", "middle", "top"]);

    // A click on a LOWER modal's visible Cancel button must be consumed by
    // nothing — it must not reach the middle modal underneath the top one.
    expect(
      engine.processMouseEvent(
        makeEvent({ action: "click", ...MIDDLE_BUTTON_POINT }),
      ),
    ).toBe(false);
    expect(clicks["middle-cancel"]).not.toHaveBeenCalled();
    expect(clicks["middle-body"]).not.toHaveBeenCalled();
    expect(clicks["low-cancel"]).not.toHaveBeenCalled();

    // A click on the TOP modal's Cancel button fires it — and the button
    // (priority 1) beats the body region containing the same point.
    expect(
      engine.processMouseEvent(
        makeEvent({ action: "click", ...TOP_BUTTON_POINT }),
      ),
    ).toBe(true);
    expect(clicks["top-cancel"]).toHaveBeenCalledTimes(1);
    expect(clicks["top-body"]).not.toHaveBeenCalled();
    expect(clicks["middle-cancel"]).not.toHaveBeenCalled();
  });

  it("closing the topmost modal promotes the next one to responder", () => {
    const engine = createEngine();
    const cancels: Record<string, () => void> = {};
    for (const modal of MODALS) {
      cancels[modal.layerId] = vi.fn<() => void>();
      registerModal(engine, modal, { onCancel: cancels[modal.layerId] });
    }
    syncModals(engine, ["low", "middle", "top"]);

    // Close the top modal (test.tsx: click Cancel → closeModalLayer).
    syncModals(engine, ["low", "middle"]);

    // The same point that was dead before now belongs to the middle modal.
    expect(
      engine.processMouseEvent(
        makeEvent({ action: "click", ...MIDDLE_BUTTON_POINT }),
      ),
    ).toBe(true);
    expect(cancels["middle"]).toHaveBeenCalledTimes(1);
    expect(cancels["low"]).not.toHaveBeenCalled();
  });

  it("hover over a lower modal's button does not enter it", () => {
    const engine = createEngine();
    const enters: Record<string, () => void> = {};
    for (const modal of MODALS) {
      enters[modal.layerId] = vi.fn<() => void>();
      engine.registerMouseRegion({
        layerId: modal.layerId,
        regionId: "cancel",
        rect: buttonRect(modal),
        callbacks: { onEnter: enters[modal.layerId] },
        priority: 1,
      });
    }
    syncModals(engine, ["low", "middle", "top"]);

    // Moving over the middle modal's visible button must not enter it.
    expect(
      engine.processMouseEvent(
        makeEvent({ action: "move", ...MIDDLE_BUTTON_POINT }),
      ),
    ).toBe(false);
    expect(enters["middle"]).not.toHaveBeenCalled();

    // Moving onto the top modal's button enters only the top modal.
    expect(
      engine.processMouseEvent(makeEvent({ action: "move", ...TOP_BUTTON_POINT })),
    ).toBe(true);
    expect(enters["top"]).toHaveBeenCalledTimes(1);
    expect(enters["middle"]).not.toHaveBeenCalled();
  });

  it("wheel over a lower modal's button does not reach it", () => {
    const engine = createEngine();
    const wheels: Record<string, () => void> = {};
    for (const modal of MODALS) {
      wheels[modal.layerId] = vi.fn<() => void>();
      engine.registerMouseRegion({
        layerId: modal.layerId,
        regionId: "cancel",
        rect: buttonRect(modal),
        callbacks: { onWheel: wheels[modal.layerId] },
        priority: 1,
      });
    }
    syncModals(engine, ["low", "middle", "top"]);

    expect(
      engine.processMouseEvent(
        makeEvent({ action: "wheel", button: "wheel-down", ...MIDDLE_BUTTON_POINT }),
      ),
    ).toBe(false);
    expect(wheels["middle"]).not.toHaveBeenCalled();

    expect(
      engine.processMouseEvent(
        makeEvent({ action: "wheel", button: "wheel-down", ...TOP_BUTTON_POINT }),
      ),
    ).toBe(true);
    expect(wheels["top"]).toHaveBeenCalledTimes(1);
  });

  it("while any modal is open, events never fall through to regular layers", () => {
    const engine = createEngine();
    const layerOnClick = vi.fn();
    engine.registerMouseRegion({
      layerId: "page-layer",
      regionId: "area",
      rect: { x: 100, y: 20, width: 10, height: 3 },
      callbacks: { onClick: layerOnClick },
    });
    for (const modal of MODALS) {
      registerModal(engine, modal, {});
    }

    // Point below all modals, inside the layer region.
    const layerPoint = { x: 105, y: 21 };
    syncModals(engine, ["low", "middle", "top"], ["page-layer"]);
    expect(
      engine.processMouseEvent(makeEvent({ action: "click", ...layerPoint })),
    ).toBe(false);
    expect(layerOnClick).not.toHaveBeenCalled();

    // All modals closed → the same point reaches the layer region.
    syncModals(engine, [], ["page-layer"]);
    expect(
      engine.processMouseEvent(makeEvent({ action: "click", ...layerPoint })),
    ).toBe(true);
    expect(layerOnClick).toHaveBeenCalledTimes(1);
  });
});
