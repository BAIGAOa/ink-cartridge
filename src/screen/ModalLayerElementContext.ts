import { createContext } from 'react';
import { ModalLayer } from './types/layer.js';


export const ModalLayerElementContext = createContext<{
  /** This field indicates the ID of this Element. */
    id: string;
    /**
     * This field indicates which layer this Element belongs to.
     */
    modalLayer: ModalLayer;
} | null>(null);
