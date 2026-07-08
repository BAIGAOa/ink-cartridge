import { ComponentType } from "react";
import { ModalEntry, OverlayEntry } from "../../screen/types.js";
import {
    ResolvedGlobalSequenceEntry,
    GlobalPendingSequence,
    ShortcutOperationEntry,
    SequenceOperationEntry,
    ScreenKeyboardLayer,
} from "../types.js";
import { LayerOwner } from "../context.js";

export interface EngineProps {
    modes?: string[]
    defaultMode?: string
}

export default class KeyboardEngine {
    path: ComponentType<any>[] = []
    activeOverlayIds: Set<string> = new Set()
    displayedOverlays: OverlayEntry[] = []
    activeModalIdRef: string | null = null
    displayedModalsRef: ModalEntry[] = []

    modesRef: Set<string>
    currentModeRef: string | null

    conditions: Map<string, boolean> = new Map();

    globalKeysRef: {
        key: string | string[];
        operate: () => void;
        cover?: boolean;
        affectOverlay?: boolean;
        category?: React.ComponentType<any>[] | "*";
        times?: number;
        observer?: (times: number) => void;
        pressCount?: number;
        executeWhenNoOverlay?: boolean;
        when?: string | (() => boolean);
        mode?: string;
    }[] = [];
    focusSubscribersRef: Set<() => void> = new Set<() => void>();
    wildcardPriorityCountRef: number = 0;

    globalSequencesRef: ResolvedGlobalSequenceEntry[] = [];

    globalPendingSeqRef: GlobalPendingSequence | null = null;

    shortcutOperationsRef: Map<string, ShortcutOperationEntry> = new Map();

    sequenceOperationsRef: Map<string, SequenceOperationEntry> = new Map();

    ownerStackRef: LayerOwner[] = [];

    layersRef: Map<LayerOwner, ScreenKeyboardLayer> = new Map();

    constructor(props: EngineProps) {
        this.modesRef = new Set(props.modes ?? [])
        this.currentModeRef = props.defaultMode ?? null
    }

    // TODO: Adapt More Methods In
}