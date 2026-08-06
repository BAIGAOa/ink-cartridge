import { Document } from "./document/document.js";
import {
	DeleteAfterOp,
	DeleteBeforeOp,
	IndentOp,
	InsertTextOp,
	JoinLineOp,
	OutdentOp,
	SplitLineOp,
} from "./document/operations.js";

export type EditorOptions = {
	indentWidth?: number;
};

export type EditorCommandArgs = Record<string, unknown> | undefined;
export type EditorCommandHandler = (doc: Document, args: EditorCommandArgs) => void;
type ChangeListener = () => void;

/**
 * Coordinator between the pure core and the keymap/render layers.
 *
 * Owns the document, a command registry (so P2 vim mode only swaps key
 * bindings, never touching the core), and the change-notification channel
 * the view subscribes to. Editing commands run operations that carry their
 * own `invert`; the history stack (P1) will collect them.
 */
export class EditorController {
	private readonly _document: Document;
	private readonly _commands = new Map<string, EditorCommandHandler>();
	private readonly _listeners = new Set<ChangeListener>();

	constructor(text: string, options: EditorOptions = {}) {
		this._document = new Document(text, { indentWidth: options.indentWidth });
		this._registerBuiltins();
	}

	get document(): Document {
		return this._document;
	}

	onChange(listener: ChangeListener): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	defineCommand(id: string, handler: EditorCommandHandler): this {
		this._commands.set(id, handler);
		return this;
	}

	execute(id: string, args: EditorCommandArgs = undefined): void {
		const handler = this._commands.get(id);
		if (!handler) {
			throw new Error(`[ink-cartridge] Unknown editor command: ${id}`);
		}
		handler(this._document, args);
		this._listeners.forEach((fn) => fn());
	}

	private _registerBuiltins(): void {
		this.defineCommand("editor.insertText", (doc, args) => {
			const text = typeof args?.text === "string" ? args.text : "";
			if (text) {
				new InsertTextOp(text).apply(doc);
			}
		});
		this.defineCommand("editor.deleteBefore", (doc) => {
			new DeleteBeforeOp().apply(doc);
		});
		this.defineCommand("editor.deleteAfter", (doc) => {
			new DeleteAfterOp().apply(doc);
		});
		this.defineCommand("editor.splitLine", (doc) => {
			new SplitLineOp().apply(doc);
		});
		this.defineCommand("editor.joinLine", (doc) => {
			new JoinLineOp().apply(doc);
		});
		this.defineCommand("editor.indent", (doc) => {
			new IndentOp().apply(doc);
		});
		this.defineCommand("editor.outdent", (doc) => {
			new OutdentOp().apply(doc);
		});

		this.defineCommand("cursor.moveLeft", (doc) => doc.moveLeft());
		this.defineCommand("cursor.moveRight", (doc) => doc.moveRight());
		this.defineCommand("cursor.moveUp", (doc) => doc.moveUp());
		this.defineCommand("cursor.moveDown", (doc) => doc.moveDown());
		this.defineCommand("cursor.lineStart", (doc) => doc.moveToLineStart());
		this.defineCommand("cursor.lineEnd", (doc) => doc.moveToLineEnd());
		this.defineCommand("cursor.wordForward", (doc) => doc.moveWordForward());
		this.defineCommand("cursor.wordBackward", (doc) => doc.moveWordBackward());
		this.defineCommand("cursor.documentStart", (doc) => doc.moveToDocumentStart());
		this.defineCommand("cursor.documentEnd", (doc) => doc.moveToDocumentEnd());
		this.defineCommand("cursor.pageUp", (doc, args) => {
			const height = typeof args?.height === "number" ? args.height : 1;
			doc.movePageUp(height);
		});
		this.defineCommand("cursor.pageDown", (doc, args) => {
			const height = typeof args?.height === "number" ? args.height : 1;
			doc.movePageDown(height);
		});
		// Mouse click: position the cursor by terminal column (not code units).
		this.defineCommand("cursor.setPosition", (doc, args) => {
			const line = typeof args?.line === "number" ? args.line : doc.cursor.line;
			const visual =
				typeof args?.visual === "number" ? args.visual : doc.cursor.visual;
			doc.setCursorAtVisual(line, visual);
		});
	}
}
