---
"blots-editor": patch
"ink-cartridge": patch
---

- **feat**(`blots-editor`): soft-wrap long lines at the editable width minus one cell (right-edge margin). The document gains a visual-line model (`visualLineCount` / `visualLineAt` / `setWrapWidth`) layered over the logical lines: line numbers render only on each logical line's first segment, the cursor moves by visual lines keeping its horizontal offset (clamping to the segment end only when the target visual line is narrower), scroll/paging work in visual-line terms, and mouse clicks on wrapped continuations land on the right logical position. Rendering is driven by `useBoxMetrics` width, so resizing re-wraps live.
- **feat**(`blots-editor`): rainbow-gradient logo ("Blots Editor") generated with the same stack as `oh-my-logo --filled` (cfonts block glyphs + gradient-string palette, truecolor via `chalk.level`), rendered as plain ANSI text so it embeds in Ink. The logo is responsive: wide terminals show the words side by side; narrow terminals stack them, and as the terminal height shrinks the font steps down (block → simple → chrome → tiny) so the menu buttons stay visible.
- **feat**(`blots-editor`): Ctrl+wheel scrolls the view without moving the cursor, clamped to the document range; the view stays put until the cursor moves again (arrow keys / click / plain wheel). Plain wheel keeps its existing behavior of actually moving the cursor one visual line per notch.
- **deps**(`blots-editor`): adds `cfonts`, `chalk`, `gradient-string`, `oh-my-logo` (runtime) and `@types/gradient-string` (dev).
