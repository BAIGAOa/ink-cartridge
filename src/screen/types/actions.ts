import {
	BackAction,
	CloseAllModalsAction,
	CloseModalAction,
	GotoScreenAction,
	OpenModalAction,
	SkipAction,
} from "../types.js";
import { ApplyElementAction, CloseAllLayerAction, CloseLayerAction, EraseElementAction, OpenLayerAction } from "./layer.js";

export type ScreenAction =
	| SkipAction
	| BackAction
	| GotoScreenAction
	| OpenModalAction
	| CloseModalAction
	| CloseAllModalsAction
	| OpenLayerAction
    | ApplyElementAction
    | CloseLayerAction
    | EraseElementAction
    | CloseAllLayerAction;
