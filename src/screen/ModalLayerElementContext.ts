import { createContext, ComponentType } from "react";
import { ModalLayer } from "./types/layer.js";

/**
 * React context for elements rendered inside a modal layer.
 *
 * Carries the element's ID, its owning modal layer, the host page, and
 * whether the modal layer automatically takes over keyboard events.
 */
export const ModalLayerElementContext = createContext<{
  /** This field indicates the ID of this Element. */
  id: string;
  /**
   * This field indicates which layer this Element belongs to.
   */
  modalLayer: ModalLayer;
  /**
   * Host page of the current layer
   */
  hostPage: ComponentType<any> | null;
  /**
   * Whether the modal layer automatically takes over keyboard events: `true`
   * for the host page, or a list of pages scoping the takeover.
   */
  auto: boolean | ComponentType<any>[];
} | null>(null);
