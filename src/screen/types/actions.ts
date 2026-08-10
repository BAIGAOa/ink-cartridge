import {
	BackAction,
	GotoScreenAction,
	SkipAction,
} from "../types.js";
import {
	ActivateElementAction,
	ActivateElementInModalLayerAction,
	ApplyElementAction,
	ApplyElementToModalLayerAction,
	CloseAllLayerAction,
	CloseAllModalLayerAction,
	CloseLayerAction,
	CloseModalLayerAction,
	DeactivateElementAction,
	DeactivateElementInModalLayerAction,
	EraseElementAction,
	EraseElementInModalLayerAction,
	OpenLayerAction,
	OpenModalLayerAction,
} from "./layer.js";

/**
 * Union of all actions handled by the screen reducer.
 */
export type ScreenAction =
	| SkipAction
	| BackAction
	| GotoScreenAction
	| OpenLayerAction
	| ApplyElementAction
	| CloseLayerAction
	| EraseElementAction
	| CloseAllLayerAction
	| OpenModalLayerAction
	| CloseModalLayerAction
	| ApplyElementToModalLayerAction
	| EraseElementInModalLayerAction
	| CloseAllModalLayerAction
	| ActivateElementAction
	| DeactivateElementAction
	| ActivateElementInModalLayerAction
	| DeactivateElementInModalLayerAction;

/**
 * String literal union of every screen action's `type` field.
 */
export type ScreenActionType =
	| "skip"
	| "back"
	| "gotoScreen"
	| "openLayer"
	| "applyElement"
	| "closeLayer"
	| "eraseElement"
	| "closeAllLayer"
	| "openModalLayer"
	| "closeModalLayer"
	| "applyElementToModalLayer"
	| "eraseElementInModalLayer"
	| "closeAllModalLayer"
	| "activateElement"
	| "deactivateElement"
	| "activateElementInModalLayer"
	| "deactivateElementInModalLayer";
