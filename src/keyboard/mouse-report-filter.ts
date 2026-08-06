/**
 * Filters SGR mouse reports out of Ink's keyboard stream.
 *
 * Ink strips the ESC prefix from unknown escape sequences before handing
 * them to `useInput` callbacks, so a mouse report `\x1b[<0;20;5M` arrives
 * as `[<0;20;5M` — the `[<` marker survives. The Mouse instance has already
 * parsed the report; swallowing it here keeps it from reaching the keyboard
 * pipeline and being treated as typed text.
 *
 * The buffer covers split delivery: a terminal may flush one report across
 * several stdin chunks, each surfacing as its own `useInput` callback.
 */
export class MouseReportFilter {
	private _buffer = "";

	/**
	 * @param input - The string Ink passed to `useInput` (ESC already stripped).
	 * @returns `true` when the input is part of a mouse report and must be
	 *          swallowed; `false` when it is normal keyboard input.
	 */
	consume(input: string): boolean {
		if (this._buffer !== "" || input.startsWith("[<")) {
			this._buffer += input;
			// A report ends with `M` (press/move) or `m` (release). The length
			// cap guards against a malformed stream leaving the filter stuck.
			if (/[Mm]$/.test(this._buffer) || this._buffer.length > 32) {
				this._buffer = "";
			}
			return true;
		}
		return false;
	}
}
