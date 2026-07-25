import React, { useReducer, useMemo, useEffect, ReactNode } from "react";
import { ScreenSystemContext, ScreenSystemContextValue } from "./context.js";
import { getTemplate, hasComponent, isChildOf, getParent } from "./registry.js";
import { ScreenAction } from "./types/actions.js";
import { BackFn, GotoScreenFn, SkipFn, SkipOptions } from "./types.js";
import {
	ApplyElementFn,
	ApplyElementToModalLayerFn,
	CloseAllLayerFn,
	CloseAllModalLayerFn,
	CloseLayerFn,
	CloseModalLayerFn,
	EraseElementFn,
	EraseElementInModalLayerFn,
	Layer,
	LayerOptions,
	ModalLayer,
	ModalLayerOptions,
	OpenLayerFn,
	OpenModalLayerFn,
} from "./types/layer.js";
import { LayerElement } from "./types/element.js";
import { ScreenState } from "./types/state.js";

const _dispatchers = new Set<React.Dispatch<ScreenAction>>();

/**
 * Clear all registered provider dispatchers.
 * Intended for test cleanup — prevents stale dispatch references
 * from leaking between test runs when providers are not properly
 * unmounted.
 */
export function clearDispatchers(): void {
	_dispatchers.clear();
}

function getDispatch(): React.Dispatch<ScreenAction> {
	if (_dispatchers.size === 0) {
		throw new Error(
			"[Ink-Cartridge] Navigation function called before Provider is mounted. Please ensure <ScenarioManagementProvider> is mounted in the component tree."
		);
	}
	return [..._dispatchers][_dispatchers.size - 1];
}

function sortLayers<T extends Layer | ModalLayer>(layers: T[]): T[] {
	return [...layers].sort((a, b) => {
		if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
		return a.createdAt - b.createdAt;
	});
}

/**
 * Navigate down the tree to a direct child of the current screen.
 */
export function skip<C extends React.ComponentType<any>>(
	component: C,
	params: React.ComponentProps<C>,
	options?: SkipOptions
): void {
	if (!hasComponent(component)) {
		throw new Error(
			`[Ink-Cartridge] Component "${
				component.displayName || component.name || "anonymous"
			}" is not registered. Please call registerComponent() first.`
		);
	}
	getDispatch()({
		type: "skip",
		component,
		params: params as Record<string, unknown>,
		onlyAttribute: options?.onlyAttribute ?? false,
	});
}

/**
 * Navigate up the tree to the parent of the current screen.
 */
export function back(levels: number = 1): void {
	if (levels < 1) {
		throw new Error("[Ink-Cartridge] back() levels must be >= 1.");
	}
	getDispatch()({ type: "back", levels });
}

/**
 * Jump to any registered screen across branches of the tree.
 */
export function gotoScreen<C extends React.ComponentType<any>>(
	component: C,
	params: React.ComponentProps<C>
): void {
	if (!hasComponent(component)) {
		throw new Error(
			`[Ink-Cartridge] Component "${
				component.displayName || component.name || "anonymous"
			}" is not registered. Please call registerComponent() first.`
		);
	}
	getDispatch()({
		type: "gotoScreen",
		component,
		params: params as Record<string, unknown>,
	});
}

/**
 * Open a new layer with a unique ID and z-index.
 */
export function openLayer(
	layerId: string,
	zIndex: number,
	options?: LayerOptions
): void {
	getDispatch()({ type: "openLayer", layerId, zIndex, options });
}

/**
 * Apply an element to a registered layer.
 */
export function applyElement(
	targetLayerId: string,
	layerElement: LayerElement
): void {
	getDispatch()({ type: "applyElement", targetLayerId, layerElement });
}

/**
 * Close a registered layer by its ID.
 */
export function closeLayer(targetLayerId: string): void {
	getDispatch()({ type: "closeLayer", targetLayerId });
}

/**
 * Remove an element from a registered layer.
 */
export function eraseElement(
	targetLayerId: string,
	targetElementId: string
): void {
	getDispatch()({ type: "eraseElement", targetLayerId, targetElementId });
}

/**
 * Close all layers at once.
 */
export function closeAllLayer(): void {
	getDispatch()({ type: "closeAllLayer" });
}

export function openModalLayer(
	layerId: string,
	zIndex: number,
	options?: ModalLayerOptions
): void {
	getDispatch()({ type: "openModalLayer", layerId, zIndex, options });
}

export function applyElementToModalLayer(
	targetModalLayerId: string,
	modalLayerElement: LayerElement
): void {
	getDispatch()({
		type: "applyElementToModalLayer",
		targetModalLayerId,
		modalLayerElement,
	});
}

export function closeModalLayer(targetModalLayerId: string): void {
	getDispatch()({ type: "closeModalLayer", targetModalLayerId });
}

export function eraseElementInModalLayer(
	targetModalLayerId: string,
	targetElementId: string
): void {
	getDispatch()({
		type: "eraseElementInModalLayer",
		targetModalLayerId,
		targetElementId,
	});
}

export function closeAllModalLayer(): void {
	getDispatch()({ type: "closeAllModaalLayer" });
}

/**
 * 从树中查找共同祖先
 * 从 currentPath 栈底向上找到第一个在 targetAncestors 中的节点
 */
function findCommonAncestor(
	currentPath: React.ComponentType<any>[],
	target: React.ComponentType<any>
): React.ComponentType<any> {
	const targetAncestors = new Set<React.ComponentType<any>>();
	let node: React.ComponentType<any> | null | undefined = target;
	while (node) {
		targetAncestors.add(node);
		node = getParent(node);
	}

	for (let i = currentPath.length - 1; i >= 0; i--) {
		if (targetAncestors.has(currentPath[i])) {
			return currentPath[i];
		}
	}

	throw new Error(
		`[Ink-Cartridge] Cannot find common ancestor. The target component may not be in the same tree.`
	);
}

/**
 * 构建从祖先到目标节点的路径（不含祖先本身）
 */
function buildPathFrom(
	ancestor: React.ComponentType<any>,
	target: React.ComponentType<any>
): React.ComponentType<any>[] {
	const path: React.ComponentType<any>[] = [];
	let node: React.ComponentType<any> | null | undefined = target;
	while (node && node !== ancestor) {
		path.push(node);
		node = getParent(node);
	}
	if (!node) {
		throw new Error(
			`[Ink-Cartridge] Target component is not a descendant of the ancestor.`
		);
	}
	path.reverse();
	return path;
}

/**
 * Pure reducer for {@link ScreenState}.
 *
 * Handles all navigation actions: skip (down), back (up), gotoScreen
 * (cross-branch), openOverlay, closeOverlay, closeAllOverlays,
 * activateOverlay, and deactivateOverlay.
 *
 * Navigation actions filter out non-persistent overlays/modals and
 * recalculate active IDs based on whether the origin screen of each
 * persistent entry is at the top of the new path.
 */
function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
	switch (action.type) {
		case "skip": {
			const current = state.path[state.path.length - 1];

			if (!isChildOf(action.component, current)) {
				throw new Error(
					`[Ink-Cartridge] "${
						action.component.displayName || action.component.name || "anonymous"
					}" is not a child of "${
						current.displayName || current.name || "anonymous"
					}". Use skip to navigate down the tree, or gotoScreen to jump across branches.`
				);
			}

			const sameComponent = action.component === current;
			const counter =
				sameComponent && action.onlyAttribute
					? state.counter
					: state.counter + 1;

			const template = getTemplate(action.component) ?? {};
			const mergedParams = { ...template, ...action.params };

			const newPath = [...state.path, action.component];

			const crossPageLayers = state.allLayers.filter(
				(each) => each.crossPage === true
			);

			const crossPageModalLayers = state.allModalLayers.filter(
				(each) => each.crossPage === true
			);

			return {
				path: newPath,
				pathParams: [...state.pathParams, mergedParams],
				counter,
				allLayers: crossPageLayers,
				allModalLayers: crossPageModalLayers,
			};
		}

		case "back": {
			const levels = action.levels ?? 1;

			if (state.path.length <= levels) {
				throw new Error(
					levels === 1
						? "[Ink-Cartridge] back() failed: already at the root node, cannot go back."
						: `[Ink-Cartridge] back(${levels}) failed: current depth is ${state.path.length}, cannot go back ${levels} levels.`
				);
			}

			const newPath = state.path.slice(0, -levels);

			const crossPageLayers = state.allLayers.filter(
				(each) => each.crossPage === true
			);

			const crossPageModalLayers = state.allModalLayers.filter(
				(each) => each.crossPage === true
			);

			return {
				path: newPath,
				pathParams: state.pathParams.slice(0, -levels),
				counter: state.counter + 1,
				allLayers: crossPageLayers,
				allModalLayers: crossPageModalLayers,
			};
		}

		case "gotoScreen": {
			const commonAncestor = findCommonAncestor(state.path, action.component);
			const ancestorIndex = state.path.indexOf(commonAncestor);

			if (ancestorIndex === -1) {
				throw new Error(
					`[Ink-Cartridge] gotoScreen failed: cannot locate common ancestor.`
				);
			}

			const suffix = buildPathFrom(commonAncestor, action.component);
			const newPath = [...state.path.slice(0, ancestorIndex + 1), ...suffix];

			const template = getTemplate(action.component) ?? {};
			const mergedParams = { ...template, ...action.params };

			const newPathParams = [
				...state.pathParams.slice(0, ancestorIndex + 1),
				...suffix.map((comp) => {
					const tpl = getTemplate(comp) ?? {};
					return comp === action.component ? mergedParams : tpl;
				}),
			];

			const crossPageLayers = state.allLayers.filter(
				(each) => each.crossPage === true
			);
			const crossPageModalLayers = state.allModalLayers.filter(
				(each) => each.crossPage === true
			);
			return {
				path: newPath,
				pathParams: newPathParams,
				counter: state.counter + 1,
				allLayers: crossPageLayers,
				allModalLayers: crossPageModalLayers,
			};
		}

		case "openLayer": {
			if (state.allLayers.some((each) => each.layerId === action.layerId)) {
				throw new Error(
					`
          [ink-cartridge] The ID of the layer you wish to register has already been registered; the duplicate ID is ${action.layerId}.
          `
				);
			}

			const newLayer: Layer = {
				layerId: action.layerId,
				zIndex: action.zIndex,
				elements: new Map(),
				crossPage: action.options?.crossPage ?? false,
				// Use the current timestamp as the creation time to ensure no errors occur,
				// even if the z-index values ​​are identical.
				createdAt: Date.now(),
			};

			const newLayers = sortLayers([...state.allLayers, newLayer]);

			return {
				...state,
				allLayers: newLayers,
			};
		}

		case "applyElement": {
			const targetLayer = state.allLayers.find(
				(each) => each.layerId === action.targetLayerId
			);

			if (!targetLayer) {
				throw new Error(
					`
          [ink-cartridge] The target ${action.targetLayerId} you entered has not been registered.

          Try calling the openLayer method.
          For example:
          const { openLayer } = useScreenSystem()

          openLayer(${action.targetLayerId}, 1)
          `
				);
			}

			if (targetLayer.elements.has(action.layerElement.elementId)) {
				throw new Error(
					`
          [in-cartridge] The element ID ${action.layerElement.elementId} you are applying has already been used on target layer ${targetLayer.layerId}; 
          try using a new one or deleting the old one.
          `
				);
			}

			targetLayer.elements.set(
				action.layerElement.elementId,
				action.layerElement
			);

			return state;
		}

		case "closeLayer": {
			const targetLayer = state.allLayers.findIndex(
				(each) => each.layerId === action.targetLayerId
			);
			if (targetLayer === -1) {
				throw new Error(
					`
          [ink-cartridge] The layer ${action.targetLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `
				);
			}

			state.allLayers.splice(targetLayer, 1);

			const newLayers = sortLayers(state.allLayers);

			return {
				...state,
				allLayers: newLayers,
			};
		}

		case "eraseElement": {
			const targetLayer = state.allLayers.find(
				(each) => each.layerId === action.targetLayerId
			);

			if (!targetLayer) {
				throw new Error(
					`
          [ink-cartridge] The layer ${action.targetLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `
				);
			}

			if (!targetLayer.elements.has(action.targetElementId)) {
				throw new Error(
					`[ink-cartridge] The target element ${action.targetElementId} does not exist in layer ${action.targetLayerId}; you may have mistyped the string, or the corresponding element was never registered.`
				);
			}

			targetLayer.elements.delete(action.targetElementId);

			return state;
		}

		case "closeAllLayer": {
			return {
				...state,
				allLayers: [],
			};
		}

		case "openModalLayer": {
			if (
				state.allModalLayers.some((each) => each.layerId === action.layerId)
			) {
				throw new Error(
					`
          [ink-cartridge] The ID of the layer you wish to register has already been registered; the duplicate ID is ${action.layerId}.
          `
				);
			}

			const newModalLayer: ModalLayer = {
				layerId: action.layerId,
				zIndex: action.zIndex,
				elements: new Map(),
				crossPage: action.options?.crossPage ?? false,
				// Use the current timestamp as the creation time to ensure no errors occur,
				// even if the z-index values ​​are identical.
				createdAt: Date.now(),
			};

			const newModalLayers = sortLayers([...state.allModalLayers, newModalLayer]);

			return {
				...state,
				allModalLayers: newModalLayers,
			};
		}

		case "applyElementToModalLayer": {
			const targetModalLayer = state.allModalLayers.find(
				(each) => each.layerId === action.targetModalLayerId
			);

			if (!targetModalLayer) {
				throw new Error(
					`
          [ink-cartridge] The target modal layer ${action.targetModalLayerId} you entered has not been registered.

          Try calling the openModalLayer method.
          For example:
          const { openModalLayer } = useScreenSystem()

          openModalLayer(${action.targetModalLayerId}, 1)
          `
				);
			}

			if (
				targetModalLayer.elements.has(action.modalLayerElement.elementId)
			) {
				throw new Error(
					`
          [ink-cartridge] The element ID ${action.modalLayerElement.elementId} you are applying has already been used on target modal layer ${targetModalLayer.layerId}; 
          try using a new one or deleting the old one.
          `
				);
			}

			targetModalLayer.elements.set(
				action.modalLayerElement.elementId,
				action.modalLayerElement
			);

			return state;
		}

		case "closeModalLayer": {
			const targetModalLayerIndex = state.allModalLayers.findIndex(
				(each) => each.layerId === action.targetModalLayerId
			);
			if (targetModalLayerIndex === -1) {
				throw new Error(
					`
          [ink-cartridge] The modal layer ${action.targetModalLayerId} you want to delete is not registered; you might have made a typo, or it was never registered at all.
          `
				);
			}

			state.allModalLayers.splice(targetModalLayerIndex, 1);

			const newModalLayers = sortLayers(state.allModalLayers);

			return {
				...state,
				allModalLayers: newModalLayers,
			};
		}

		case "eraseElementInModalLayer": {
			const targetModalLayer = state.allModalLayers.find(
				(each) => each.layerId === action.targetModalLayerId
			);

			if (!targetModalLayer) {
				throw new Error(
					`
          [ink-cartridge] The modal layer ${action.targetModalLayerId} you want to delete elements from is not registered; you might have made a typo, or it was never registered at all.
          `
				);
			}

			if (!targetModalLayer.elements.has(action.targetElementId)) {
				throw new Error(
					`[ink-cartridge] The target element ${action.targetElementId} does not exist in modal layer ${action.targetModalLayerId}; you may have mistyped the string, or the corresponding element was never registered.`
				);
			}

			targetModalLayer.elements.delete(action.targetElementId);

			return state;
		}

		case "closeAllModaalLayer": {
			return {
				...state,
				allModalLayers: [],
			};
		}

		default:
			return state;
	}
}

export interface ScenarioManagementProviderProps {
	children: ReactNode;
	/** 默认屏幕组件（必填，需先 registerComponent） */
	defaultScreen: React.ComponentType<any>;
	/** 默认参数（可选，未传则使用注册时的模板参数） */
	defaultParams?: Record<string, unknown>;

	fullScreen?: boolean;
}

/**
 * Screen-management context provider.
 *
 * Wraps the application and enables tree-based screen navigation, overlays,
 * and module-level navigation functions.
 */
export function ScenarioManagementProvider({
	children,
	defaultScreen,
	defaultParams,
	fullScreen,
}: ScenarioManagementProviderProps) {
	if (!hasComponent(defaultScreen)) {
		throw new Error(
			`[Ink-Cartridge] defaultScreen "${
				defaultScreen.displayName || defaultScreen.name || "anonymous"
			}" is not registered. Please call registerComponent() first.`
		);
	}

	const initialParams = defaultParams ?? getTemplate(defaultScreen) ?? {};

	const [state, dispatch] = useReducer(screenReducer, {
		path: [defaultScreen],
		pathParams: [initialParams],
		counter: 0,
		allLayers: [],
		allModalLayers: [],
	});

	useEffect(() => {
		_dispatchers.add(dispatch);
		return () => {
			_dispatchers.delete(dispatch);
		};
	}, []);

	const topComponent = state.path[state.path.length - 1];
	const topParams = state.pathParams[state.pathParams.length - 1];

	const pageLayer = useMemo(
		() =>
			React.createElement(topComponent, {
				...topParams,
				key: state.counter,
			}),
		[topComponent, topParams, state.counter]
	);

	// Context 内的导航方法
	const skipInContext: SkipFn = useMemo(
		() => (component, params, options) => {
			if (!hasComponent(component)) {
				throw new Error(
					`[Ink-Cartridge] Component "${
						component.displayName || component.name || "anonymous"
					}" is not registered.`
				);
			}
			dispatch({
				type: "skip",
				component,
				params: params as Record<string, unknown>,
				onlyAttribute: options?.onlyAttribute ?? false,
			});
		},
		[]
	);

	const backInContext: BackFn = useMemo(
		() =>
			(levels: number = 1) => {
				if (levels < 1) {
					throw new Error("[Ink-Cartridge] back() levels must be >= 1.");
				}
				dispatch({ type: "back", levels });
			},
		[]
	);

	const gotoScreenInContext: GotoScreenFn = useMemo(
		() => (component, params) => {
			if (!hasComponent(component)) {
				throw new Error(
					`[Ink-Cartridge] Component "${
						component.displayName || component.name || "anonymous"
					}" is not registered.`
				);
			}
			dispatch({
				type: "gotoScreen",
				component,
				params: params as Record<string, unknown>,
			});
		},
		[]
	);

	const openLayerInContext: OpenLayerFn = useMemo(
		() => (layerId: string, zIndex: number, options?: LayerOptions) => {
			dispatch({
				type: "openLayer",
				layerId,
				zIndex,
				options: options,
			});
		},
		[]
	);

	const applyElementInContext: ApplyElementFn = useMemo(
		() => (targetLayerId: string, layerElement: LayerElement) => {
			dispatch({ type: "applyElement", targetLayerId, layerElement });
		},
		[]
	);

	const closeLayerInContext: CloseLayerFn = useMemo(
		() => (targetLayerId: string) => {
			dispatch({ type: "closeLayer", targetLayerId });
		},
		[]
	);

	const eraseElementInContext: EraseElementFn = useMemo(
		() => (targetLayerId: string, targetElementId: string) => {
			dispatch({ type: "eraseElement", targetLayerId, targetElementId });
		},
		[]
	);

	const closeAllLayerInContext: CloseAllLayerFn = useMemo(
		() => () => {
			dispatch({ type: "closeAllLayer" });
		},
		[]
	);

	const openModalLayerInContext: OpenModalLayerFn = useMemo(
		() =>
			(layerId: string, zIndex: number, options?: ModalLayerOptions) => {
				dispatch({
					type: "openModalLayer",
					layerId,
					zIndex,
					options: options,
				});
			},
		[]
	);

	const applyElementToModalLayerInContext: ApplyElementToModalLayerFn =
		useMemo(
			() =>
				(
					targetModalLayerId: string,
					modalLayerElement: LayerElement
				) => {
					dispatch({
						type: "applyElementToModalLayer",
						targetModalLayerId,
						modalLayerElement,
					});
				},
			[]
		);

	const closeModalLayerInContext: CloseModalLayerFn = useMemo(
		() => (targetModalLayerId: string) => {
			dispatch({ type: "closeModalLayer", targetModalLayerId });
		},
		[]
	);

	const eraseElementInModalLayerInContext: EraseElementInModalLayerFn =
		useMemo(
			() =>
				(targetModalLayerId: string, targetElementId: string) => {
					dispatch({
						type: "eraseElementInModalLayer",
						targetModalLayerId,
						targetElementId,
					});
				},
			[]
		);

	const closeAllModalLayerInContext: CloseAllModalLayerFn = useMemo(
		() => () => {
			dispatch({ type: "closeAllModaalLayer" });
		},
		[]
	);

	const value: ScreenSystemContextValue = useMemo(
		() => ({
			pageLayer,
			allLayers: state.allLayers,
			allModalLayers: state.allModalLayers,
			currentPath: state.path,
			skip: skipInContext,
			back: backInContext,
			gotoScreen: gotoScreenInContext,
			openLayer: openLayerInContext,
			applyElement: applyElementInContext,
			closeLayer: closeLayerInContext,
			eraseElement: eraseElementInContext,
			closeAllLayer: closeAllLayerInContext,
			openModalLayer: openModalLayerInContext,
			applyElementToModalLayer: applyElementToModalLayerInContext,
			closeModalLayer: closeModalLayerInContext,
			eraseElementInModalLayer: eraseElementInModalLayerInContext,
			closeAllModalLayer: closeAllModalLayerInContext,
			fullScreen,
		}),
		[
			pageLayer,
			state.path,
			state.allLayers,
			state.allModalLayers,
			skipInContext,
			backInContext,
			gotoScreenInContext,
			openLayerInContext,
			applyElementInContext,
			closeLayerInContext,
			eraseElementInContext,
			closeAllLayerInContext,
			openModalLayerInContext,
			applyElementToModalLayerInContext,
			closeModalLayerInContext,
			eraseElementInModalLayerInContext,
			closeAllModalLayerInContext,
			fullScreen,
		]
	);

	return (
		<ScreenSystemContext.Provider value={value}>
			{children}
		</ScreenSystemContext.Provider>
	);
}
