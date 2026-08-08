import chalk from "chalk";
import cfonts from "cfonts";
import gradient from "gradient-string";

/**
 * "Blots Editor" rainbow-gradient logo.
 *
 * Generated with the same stack `oh-my-logo --filled` uses (cfonts block
 * glyphs + gradient-string palette) but as a plain string, since
 * oh-my-logo's own `renderFilled` renders through its own ink instance and
 * cannot be embedded. `chalk.level` is forced so the gradient survives
 * non-interactive output (pipes, tests).
 *
 * `getLogo(columns, rows)` picks a size tier from terminal dimensions so the
 * logo shrinks instead of crowding out the menu buttons on small screens.
 */
chalk.level = 3;

const RAINBOW = [
	"#FF0000",
	"#FF7F00",
	"#FFFF00",
	"#00FF00",
	"#0000FF",
	"#8B00FF",
];

const FONTS = {
	block: "block",
	simple: "simple",
	chrome: "chrome",
	tiny: "tiny",
} as const;

type FontName = keyof typeof FONTS;

const renderBlock = (text: string, font: FontName): string[] => {
	const result = cfonts.render(text, {
		font: FONTS[font],
		align: "left",
		colors: ["system"],
		backgroundColor: "transparent",
		letterSpacing: 1,
		lineHeight: 1,
		space: true,
		maxLength: 0,
	});
	// cfonts returns `false` when it cannot render; fall back to plain text.
	const art = (result === false ? text : result.string).replace(
		/^\n+|\n+$/g,
		"",
	);
	return art.split("\n");
};

/** Side-by-side layout: "Blots  Editor" on shared lines. */
const wide = (font: FontName): string => {
	const blots = renderBlock("Blots", font);
	const editor = renderBlock("Editor", font);
	return blots.map((line, i) => `${line}  ${editor[i] ?? ""}`).join("\n");
};

/** Stacked layout: "Blots" above "Editor". */
const narrow = (font: FontName): string =>
	`${renderBlock("Blots", font).join("\n")}\n\n${renderBlock(
		"Editor",
		font,
	).join("\n")}`;

/** Same gradient pass across the whole logo, whichever layout/font. */
const toLogo = (plain: string): string => gradient(RAINBOW).multiline(plain);

/** Size tiers: (min rows, min cols for side-by-side) → (layout, font). */
const TIERS = [
	// Wide screens: words side by side; shrink the font as height drops.
	{ minCols: 104, minRows: 26, build: () => wide("block") },
	{ minCols: 104, minRows: 20, build: () => wide("simple") },
	{ minCols: 104, minRows: 0, build: () => wide("tiny") },
	// Narrow screens: words stacked; shrink the font as height drops.
	{ minCols: 0, minRows: 30, build: () => narrow("block") },
	{ minCols: 0, minRows: 24, build: () => narrow("simple") },
	{ minCols: 0, minRows: 20, build: () => narrow("chrome") },
	{ minCols: 0, minRows: 0, build: () => narrow("tiny") },
] as const;

const cache = new Map<string, string>();

/**
 * Pick the logo variant for the current terminal size. Wider screens get the
 * words side by side; narrower screens stack them, and shrinking height steps
 * the font down (block → simple → chrome → tiny) so buttons stay visible.
 */
export function getLogo(columns: number, rows: number): string {
	for (const tier of TIERS) {
		if (columns >= tier.minCols && rows >= tier.minRows) {
			const key = tier.build.toString();
			let logo = cache.get(key);
			if (!logo) {
				logo = toLogo(tier.build());
				cache.set(key, logo);
			}
			return logo;
		}
	}
	return toLogo(wide("block"));
}
