import {
	defaultTargetsSymbol,
	FocusTarget,
	ScreenKeyboardLayer,
} from "../types.js";
import EngineState from "./EngineState.js";

export default class LayerManager<TComponent = unknown> {
	constructor(private state: EngineState<TComponent>) {}

	prevPathRef: TComponent[] = [];
	prevOverlayIdsRef: Set<string> = new Set();
	prevModalIdsRef: Set<string> = new Set();

	cleanLayers() {
		const prev = this.prevPathRef;
		for (const comp of prev) {
			if (!this.state.path.includes(comp)) {
				const layer = this.state.layersRef.get(comp);
				if (layer?.pendingSequence) {
					clearTimeout(layer.pendingSequence.timer);
					layer.pendingSequence = null;
				}
				this.state.layersRef.delete(comp);
			}
		}
		this.prevPathRef = this.state.path;
	}

	cleanOverlayLayers() {
		const currentIds = new Set(this.state.displayedOverlays.map((o) => o.id));

		for (const prevId of this.prevOverlayIdsRef) {
			if (!currentIds.has(prevId)) {
				const layer = this.state.layersRef.get(prevId);
				if (layer?.pendingSequence) {
					clearTimeout(layer.pendingSequence.timer);
					layer.pendingSequence = null;
				}
				this.state.layersRef.delete(prevId);
			}
		}

		this.prevOverlayIdsRef = currentIds;
	}

	cleanModalLayers() {
		const currentIds = new Set(this.state.displayedModalsRef.map((m) => m.id));

		for (const prevId of this.prevModalIdsRef) {
			if (!currentIds.has(prevId)) {
				const layer = this.state.layersRef.get(prevId);
				if (layer?.pendingSequence) {
					clearTimeout(layer.pendingSequence.timer);
					layer.pendingSequence = null;
				}
				this.state.layersRef.delete(prevId);
			}
		}

		this.prevModalIdsRef = currentIds;
	}

	pushOwner(owner: TComponent | string) {
		this.state.ownerStackRef = [...this.state.ownerStackRef, owner];
	}

	popOwner(owner: TComponent | string) {
		const stack = this.state.ownerStackRef;
		const idx = stack.lastIndexOf(owner);
		if (idx !== -1) {
			this.state.ownerStackRef = [
				...stack.slice(0, idx),
				...stack.slice(idx + 1),
			];
		}
	}

	getLayer(owner: TComponent | string) {
		let layer = this.state.layersRef.get(owner);
		if (!layer) {
			let kind: "screen" | "overlay" | "modal" = "screen";
			if (typeof owner === "string") {
				if (this.state.displayedModalsRef.some((m) => m.id === owner)) {
					kind = "modal";
				} else if (this.state.displayedOverlays.some((m) => m.id === owner)) {
					kind = "overlay";
				}
			}

			layer = {
				kind,
				bindings: [],
				penetrationKeys: [],
				stoppedKeys: [],
				allowedKeys: [],
				globalKeyOverrides: new Set(),
				focusTargets: new Map(),
				defaultFocusOrder: [],
				currentFocusIds: [],
				defaultTargets: new Map(),
				actionKeysMap: new Map(),
				sequences: new Map(),
				pendingSequence: null,
			};
			this.state.layersRef.set(owner, layer);
		}
		return layer;
	}

	getCurrentOwner(): TComponent | string | null {
		const stack = this.state.ownerStackRef;
		if (stack.length > 0) return stack[stack.length - 1];
		if (this.state.path.length === 0) return null;
		return this.state.path[this.state.path.length - 1];
	}

	notifyFocusChange() {
		this.state.focusSubscribersRef.forEach((fn) => fn());
	}

	clearPendingSequence(layer: ScreenKeyboardLayer) {
		if (layer.pendingSequence !== null) {
			clearTimeout(layer.pendingSequence.timer);
			layer.pendingSequence = null;
		}
	}

	getOrCreateFocusTarget(
		layer: ScreenKeyboardLayer,
		focusId: string,
		group?: string,
	): FocusTarget {
		if (group && typeof group === 'string') {
			let g = layer.focusTargets.get(group);
			let target: FocusTarget | undefined;

			if (!g) {
				g = {
					map: new Map<string, FocusTarget>(),
					order: [],
				};

				target = {
					bindings: [],
					stoppedKeys: [],
					penetrationKeys: [],
					allowedKeys: [],
					actionKeysMap: new Map(),
				};

				// Since the group has just been created, there must be no focusId in it.
				g.map.set(focusId, target);
				g.order.push(focusId);
				layer.focusTargets.set(group, g);
			} else {
				target = g.map.get(focusId);
				if (!target) {
					target = {
						bindings: [],
						stoppedKeys: [],
						penetrationKeys: [],
						allowedKeys: [],
						actionKeysMap: new Map(),
					};

					g.map.set(focusId, target);
					g.order.push(focusId);
				}
			}

			if (layer.currentFocusIds.length === 0) {
				layer.currentFocusIds.push({ fromGroup: group, id: focusId });
				this.notifyFocusChange();
			}

			return target;
		}
		let target = layer.defaultTargets.get(focusId);
		if (!target) {
			target = {
				bindings: [],
				penetrationKeys: [],
				stoppedKeys: [],
				allowedKeys: [],
				actionKeysMap: new Map(),
			};
			layer.defaultTargets.set(focusId, target);
			layer.defaultFocusOrder.push(focusId);
			if (layer.currentFocusIds.length === 0) {
				layer.currentFocusIds.push({
					fromGroup: defaultTargetsSymbol,
					id: focusId,
				});
				this.notifyFocusChange();
			}
		}
		return target;
	}

	readLayer(owner: TComponent | string) {
		return this.state.layersRef.get(owner);
	}

	subscribeFocus(listener: () => void) {
		this.state.focusSubscribersRef.add(listener);
		return () => {
			this.state.focusSubscribersRef.delete(listener);
		};
	}

	focusSet(focusId: string, group?: string) {
		const owner = this.getCurrentOwner();
		if (!owner) return;
		const ownerName =
			typeof owner === "string"
				? owner
				: (owner as any).displayName || (owner as any).name || "Unknown";
		const layer = this.state.layersRef.get(owner);
		if (!layer) {
			throw new Error(
				`[keyboard-engine] focusSet("${focusId}"): no keyboard layer found for "${ownerName}". ` +
					`Did you forget to wrap the screen in a keyboard provider?`,
			);
		}
		this.clearPendingSequence(layer);

		if (group) {
			const g = layer.focusTargets.get(group);
			if (!g) {
				throw new Error(
					`[keyboard-engine] focusSet("${focusId}", "${group}"): Focus group ${group} is not registered in layer ${ownerName}. Call methods such as bound Keyboard to register automatically`,
				);
			}

			if (!g.map.has(focusId)) {
				const allFocus =
					g.order.length > 0
						? g.order.map((each) => `"${each}"`).join(", ")
						: "(none)";

				throw new Error(
					`[keyboard-engine] focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
						`Available targets: ${allFocus}`,
				);
			}

			const has = layer.currentFocusIds.findIndex((each) => {
				// Duplicate groups are not permitted within `currentFocusIds`;
				// each group must have either exactly one active focus or no active focus.
				// Therefore, only the group identity is checked here.
				return each.fromGroup === group;
			});

			if (has !== -1) {
				layer.currentFocusIds.splice(has, 1);
			}
			layer.currentFocusIds.push({ id: focusId, fromGroup: group });
			this.notifyFocusChange();
		} else {
			if (!layer.defaultTargets.has(focusId)) {
				const available =
					layer.defaultFocusOrder.length > 0
						? layer.defaultFocusOrder.map((id) => `"${id}"`).join(", ")
						: "(none)";

				throw new Error(
					`[keyboard-engine] focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
						`Available targets: ${available}`,
				);
			}

			const idx = layer.currentFocusIds.findIndex((each) => {
				return each.fromGroup === defaultTargetsSymbol;
			});

			if (idx !== -1) {
				layer.currentFocusIds.splice(idx, 1);
			}
			layer.currentFocusIds.push({
				id: focusId,
				fromGroup: defaultTargetsSymbol,
			});
			this.notifyFocusChange();
		}
	}

	focusNext(group?: string) {
		const owner = this.getCurrentOwner();
		if (!owner) return;
		const layer = this.state.layersRef.get(owner);
		if (!layer) return;

		this.clearPendingSequence(layer);

		if (group) {
			const g = layer.focusTargets.get(group);
			if (!g) {
				throw new Error(
					`[keyboard-engine] focusNext("${group}"): Focus group ${group} is not registered. Call methods such as boundKeyboard to register automatically`,
				);
			}

			const idx = layer.currentFocusIds.findIndex((each) => {
				if (each.fromGroup === group) {
					return true;
				}
				return false;
			});

			if (idx !== -1) {
				// We execute the switching logic only when the group actually has an active focus within `currentFocusIds`;
				// this ensures determinism. This method does not activate focus for any group;
				// it is solely responsible for switching.
				const inCurrentGroup = layer.currentFocusIds[idx];
				let inOrderIndex = g.order.indexOf(inCurrentGroup.id);
				inOrderIndex = (inOrderIndex + 1) % g.order.length;

				const result = g.order[inOrderIndex];
				layer.currentFocusIds.splice(idx, 1);
				layer.currentFocusIds.push({
					id: result,
					fromGroup: group,
				});
				this.notifyFocusChange();
			}
		} else {
			const currents = layer.currentFocusIds;
			const index = currents.findIndex((each) => {
				return each.fromGroup === defaultTargetsSymbol;
			});

			if (index !== -1) {
				const inCurrentGroup = currents[index];
				let inOrderIndex = layer.defaultFocusOrder.indexOf(inCurrentGroup.id);
				inOrderIndex = (inOrderIndex + 1) % layer.defaultFocusOrder.length;

				const result = layer.defaultFocusOrder[inOrderIndex];
				layer.currentFocusIds.splice(index, 1);
				layer.currentFocusIds.push({
					id: result,
					fromGroup: defaultTargetsSymbol,
				});
			}
		}
	}

	focusPrev(group?: string) {
		const owner = this.getCurrentOwner();
		if (!owner) return;
		const layer = this.state.layersRef.get(owner);
		if (!layer) return;

		this.clearPendingSequence(layer);

		if (group) {
			const g = layer.focusTargets.get(group);
			if (!g) {
				throw new Error(
					`[keyboard-engine] focusPrev("${group}"): Focus group ${group} is not registered. Call methods such as boundKeyboard to register automatically`,
				);
			}

			const idx = layer.currentFocusIds.findIndex((each) => {
				if (each.fromGroup === group) {
					return true;
				}
				return false;
			});

			if (idx !== -1) {
				// We execute the switching logic only when the group actually has an active focus within `currentFocusIds`;
				// this ensures determinism. This method does not activate focus for any group;
				// it is solely responsible for switching.
				const inCurrentGroup = layer.currentFocusIds[idx];
				let inOrderIndex = g.order.indexOf(inCurrentGroup.id);
				inOrderIndex = (inOrderIndex - 1 + g.order.length) % g.order.length;

				const result = g.order[inOrderIndex];
				layer.currentFocusIds.splice(idx, 1);
				layer.currentFocusIds.push({
					id: result,
					fromGroup: group,
				});
				this.notifyFocusChange();
			}
		} else {
			const currents = layer.currentFocusIds;
			const index = currents.findIndex((each) => {
				return each.fromGroup === defaultTargetsSymbol;
			});

			if (index !== -1) {
				const inCurrentGroup = currents[index];
				let inOrderIndex = layer.defaultFocusOrder.indexOf(inCurrentGroup.id);
				inOrderIndex =
					(inOrderIndex - 1 + layer.defaultFocusOrder.length) %
					layer.defaultFocusOrder.length;

				const result = layer.defaultFocusOrder[inOrderIndex];
				layer.currentFocusIds.splice(index, 1);
				layer.currentFocusIds.push({
					id: result,
					fromGroup: defaultTargetsSymbol,
				});
			}
		}
	}

	focusCurrent(group?: string) {
		const owner = this.getCurrentOwner();
		if (!owner) {
      return {
        noOwner: true
      }
    };
		const layer = this.state.layersRef.get(owner);
		if (!layer) {
      return {
        noLayer: true
      }
    };

		if (group) {
			const g = layer.focusTargets.get(group);
			if (!g) {
				throw new Error(
          `[keyboard-engine] focusCurrent(${group}): The focus group passed to the current method is not registered. 
          Please call methods such as boundKeyboard, which handle registration automatically.`
        );
			}

      const index = layer.currentFocusIds.findIndex(each => each.fromGroup === group)

      if (index === -1) {
        return {
          noFound: true
        }
      } else {
        const result = layer.currentFocusIds[index]
        return {
          result: result
        }
      }
		} else {
      const index = layer.currentFocusIds.findIndex(each => each.fromGroup === defaultTargetsSymbol)
      
      if (index === -1) {
        return {
          noFound: true
        }
      } else {
        const result = layer.currentFocusIds[index]
        return {
          result: result
        }
      }
    }

		
	}

	focusUnregister(focusId: string, group?: string) {
		const owner = this.getCurrentOwner();
		if (!owner) return;
		const layer = this.state.layersRef.get(owner);
		if (!layer) return;

    // Silently no-op when the focusId/group is not on the current owner's
    // layer. During unmount, engine.sync() has already advanced state.path to
    // the new screen (render happens before effect cleanups), so
    // getCurrentOwner() returns the NEW screen while the focusId lives on the
    // UNMOUNTING screen's layer. cleanLayers() removes that whole layer
    // shortly after, making this call redundant — but it must not throw.
    if (group) {
      const g = layer.focusTargets.get(group)
      if (!g) return;

      const target = g.map.get(focusId)
      if (!target) return;

      const index = layer.currentFocusIds.findIndex(each => each.fromGroup === group && each.id === focusId)
      const wasFocused = index === -1 ? false : true

      g.map.delete(focusId)
      g.order = g.order.filter(id => id !== focusId)

      if (wasFocused) {
        layer.currentFocusIds.splice(index, 1)
        const result = g.order.length > 0 ? g.order[0] : null
        if (result) {
          layer.currentFocusIds.push({
            id: result,
            fromGroup: group
          })
        }
        this.notifyFocusChange()
      }
    } else {
      const target = layer.defaultTargets.get(focusId)
      if (!target) return;

      const index = layer.currentFocusIds.findIndex(each => each.fromGroup === defaultTargetsSymbol && each.id === focusId)
      const wasFocused = index === -1 ? false : true

      layer.defaultTargets.delete(focusId)
      layer.defaultFocusOrder = layer.defaultFocusOrder.filter(each => each !== focusId)

      if (wasFocused) {
        layer.currentFocusIds.splice(index, 1)
        const result = layer.defaultFocusOrder.length > 0 ? layer.defaultFocusOrder[0] : null
        if (result) {
          layer.currentFocusIds.push({
            id: result,
            fromGroup: defaultTargetsSymbol
          })
        }
        this.notifyFocusChange()
      }
    }
	}


}
