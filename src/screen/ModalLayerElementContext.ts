import React, { createContext } from "react";
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
  hostPage: React.ComponentType<any> | null;
  /**
   * Flag to automatically take over keyboard events
   */
  auto: boolean;
} | null>(null);
