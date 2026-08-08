import stringWidth from "string-width";

/**
 * A single line of text with its terminal width cached.
 *
 * `_prefix[i]` is the cumulative terminal width of the first `i` code units
 * (0 at line start). Surrogate pairs (e.g. emoji) span 2 code units and share
 * the same prefix at the middle index — the cursor never sits inside a
 * surrogate pair, but aligning the array to code units lets `visualAt` /
 * `logicalAt` use direct indexing and binary search instead of per-character
 * scans on every call.
 */
export class TextLine {
	private readonly _prefix: number[];
	readonly width: number;

	constructor(readonly text: string) {
		const prefix: number[] = [0];
		let sum = 0;
		for (let i = 0; i < text.length; ) {
			const cp = text.codePointAt(i)!;
			const w = stringWidth(String.fromCodePoint(cp));
			const units = cp > 0xffff ? 2 : 1;
			for (let k = 0; k < units; k++) {
				prefix.push(sum + w);
			}
			sum += w;
			i += units;
		}
		this._prefix = prefix;
		this.width = sum;
	}

	/** Terminal column of the given code unit index, clamped to `[0, text.length]`. */
	visualAt(logical: number): number {
		const i = Math.max(0, Math.min(logical, this.text.length));
		return this._prefix[i];
	}

	/**
	 * Terminal column → nearest valid cursor position (code unit index).
	 * When the target column falls inside a wide character, snap left
	 * (largest prefix not exceeding the target).
	 */
	logicalAt(visual: number): number {
		if (visual <= 0) {
			return 0;
		}
		let lo = 0;
		let hi = this.text.length;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (this._prefix[mid] <= visual) {
				lo = mid;
			} else {
				hi = mid - 1;
			}
		}
		return lo;
	}

	/**
	 * Cut one soft-wrap segment starting at `startVisual`: the longest
	 * slice whose terminal width is at most `wrapWidth`. Returns the segment
	 * text plus the visual/logical position where it ends (the next call's
	 * `startVisual`). A single character wider than `wrapWidth` (or the
	 * trailing empty segment at line end) is returned on its own so the
	 * caller always makes progress.
	 */
	segmentFrom(
		startVisual: number,
		wrapWidth: number,
	): { text: string; endVisual: number; endLogical: number } {
		const start = this.logicalAt(startVisual);
		if (start >= this.text.length) {
			return {
				text: "",
				endVisual: this.visualAt(start),
				endLogical: start,
			};
		}
		const startVisualActual = this.visualAt(start);
		const limit = startVisualActual + Math.max(1, wrapWidth);
		let end = this.logicalAt(limit);
		// `logicalAt` may snap left onto a wide char; guarantee progress by
		// taking at least one code point (a surrogate pair counts as one).
		if (end <= start) {
			end = start + (this.text.codePointAt(start)! > 0xffff ? 2 : 1);
		}
		return {
			text: this.text.slice(start, end),
			endVisual: this.visualAt(end),
			endLogical: end,
		};
	}
}
