import { createModalProcessor } from "../processors/modal.js";
import { createGlobalSequenceProcessor } from "../processors/globalSequence.js";
import { createGlobalKeyProcessor } from "../processors/globalKey.js";
import { createOverlayProcessor } from "../processors/overlay.js";
import { createScreenStackProcessor } from "../processors/screenStack.js";
import { _insertRelative } from "../pipeline/chain.js";
import { KeyboardProcessorProps, PipelineProcessor } from "../types.js";
import EngineState from "./EngineState.js";

export default class PipelineManager {
    constructor(private state: EngineState, custom?: KeyboardProcessorProps[]) {
        this.state._processors = this._buildDefaultProcessors(custom);
    }

    _buildDefaultProcessors(custom?: KeyboardProcessorProps[]): PipelineProcessor[] {
        const defaults: PipelineProcessor[] = [
            createModalProcessor(),
            createGlobalSequenceProcessor({ affectOverlay: true }),
            createGlobalKeyProcessor({ affectOverlay: true }),
            createOverlayProcessor(),
            createGlobalSequenceProcessor({ affectOverlay: false }),
            createGlobalKeyProcessor({ affectOverlay: false }),
            createScreenStackProcessor(),
        ];

        if (!custom || custom.length === 0) return defaults;

        return _insertRelative(defaults, custom);
    }

    addProcessor(
        processor: PipelineProcessor,
        options?:
            | { before?: string }
            | { after?: string }
            | { index?: number },
    ): void {
        if (this.state._processors.some((p) => p.id === processor.id)) {
            throw new Error(
                `[ink-cartridge] Cannot add processor "${processor.id}": duplicate id`,
            );
        }

        const opts = options ?? {};

        if ("index" in opts && typeof opts.index === "number") {
            this.state._processors.splice(opts.index, 0, processor);
            return;
        }

        const target =
            "before" in opts ? opts.before : "after" in opts ? opts.after : undefined;

        if (target) {
            const kind = "before" in opts ? "before" : "after";
            const idx = this.state._processors.findIndex((p) => p.id === target);
            if (idx === -1) {
                throw new Error(
                    `[ink-cartridge] Cannot insert ${kind} "${target}": processor not found`,
                );
            }
            this.state._processors.splice(kind === "before" ? idx : idx + 1, 0, processor);
            return;
        }

        this.state._processors.push(processor);
    }

    removeProcessor(processorId: string): boolean {
        const idx = this.state._processors.findIndex((each) => each.id === processorId);

        if (idx === -1) {
            return false;
        }

        this.state._processors.splice(idx, 1);
        return true;
    }

    getProcessors(): readonly PipelineProcessor[] {
        return this.state._processors;
    }

    resetProcessors(): void {
        this.state._processors = this._buildDefaultProcessors();
    }
}
