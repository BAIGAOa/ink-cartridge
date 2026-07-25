import {
	BackAction,
	GotoScreenAction,
	SkipAction,
} from "../types.js";
import {
	ApplyElementAction,
	ApplyElementToModalLayerAction,
	CloseAllLayerAction,
	CloseAllModaalLayerAction,
	CloseLayerAction,
	CloseModalLayerAction,
	EraseElementAction,
	EraseElementInModalLayerAction,
	OpenLayerAction,
	OpenModalLayerAction,
} from "./layer.js";

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
	| CloseAllModaalLayerAction;

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
	| "closeAllModaalLayer";
