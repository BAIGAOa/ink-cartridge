import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

export interface InitThemeOptions {
  /** Output directory for theme JSON files (default: "./themes"). */
  outputDir: string;
}

/**
 * Interactive theme scaffold command.
 *
 * Prompts the user for theme ids, keys (color or style), and per-theme values,
 * then writes one {id}.json file per theme with identical key sets.
 *
 * @example
 *   npx ink-kit initTheme --output ./my-themes
 */
export function initTheme(options: InitThemeOptions): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  (async () => {
    console.log('');
    console.log('  ink-kit theme scaffold');
    console.log('  ─────────────────────');
    console.log('');

    // Step 1: theme ids
    const idsRaw = await ask('  Theme ids (comma-separated, e.g. "dark,light"): ');
    const ids = idsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length < 2) {
      console.error('Error: at least 2 theme ids are required.');
      rl.close();
      process.exit(1);
    }

    // Validate no duplicates
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        console.error(`Error: duplicate theme id "${id}".`);
        rl.close();
        process.exit(1);
      }
      seen.add(id);
    }

    console.log('');
    console.log(`  Themes: ${ids.join(', ')}`);
    console.log('');

    // Step 2: define keys
    type KeyDef = { name: string; kind: 'color' | 'style' };
    const keys: KeyDef[] = [];

    console.log('  Define your theme keys one at a time.');
    console.log('  Format: <key-name> <color|style>');
    console.log('  Examples: primary color, titleBold style');
    console.log('  Press Enter on an empty line when done.');
    console.log('');

    while (true) {
      const line = await ask('  Key: ');
      if (!line.trim()) break;

      const parts = line.trim().split(/\s+/);
      if (parts.length !== 2 || !['color', 'style'].includes(parts[1])) {
        console.log('  Invalid format. Use: <key-name> <color|style>');
        continue;
      }

      const name = parts[0];
      const kind = parts[1] as 'color' | 'style';

      if (keys.some((k) => k.name === name)) {
        console.log(`  Key "${name}" already defined.`);
        continue;
      }

      keys.push({ name, kind });
      console.log(`  ✓ Added ${kind} key: "${name}"`);
    }

    if (keys.length === 0) {
      console.error('Error: at least one key is required.');
      rl.close();
      process.exit(1);
    }

    console.log('');
    console.log(`  Keys (${keys.length}): ${keys.map((k) => `${k.name}(${k.kind})`).join(', ')}`);
    console.log('');

    // Step 3: per-theme values
    const themes: Record<string, Record<string, string | boolean>> = {};

    for (const id of ids) {
      console.log(`  ── Theme "${id}" ──`);
      const values: Record<string, string | boolean> = { id };

      for (const key of keys) {
        const defaultVal = key.kind === 'color' ? 'white' : 'false';
        const val = await ask(`    ${key.name} (${key.kind}, default: ${defaultVal}): `);
        const trimmed = val.trim();

        if (key.kind === 'color') {
          values[key.name] = trimmed || 'white';
        } else {
          const lower = trimmed.toLowerCase();
          values[key.name] = lower === 'true' || lower === '1' || lower === 'yes';
        }
      }

      themes[id] = values;
      console.log('');
    }

    // Step 4: write files
    const outDir = path.resolve(options.outputDir);
    fs.mkdirSync(outDir, { recursive: true });

    for (const id of ids) {
      const filePath = path.join(outDir, `${id}.json`);
      const obj: Record<string, unknown> = { id, ...themes[id] };
      delete obj.id; // id is already there, we set it above — need to restructure
      // Build clean object with id first
      const clean: Record<string, unknown> = { id };
      for (const [k, v] of Object.entries(themes[id])) {
        if (k !== 'id') clean[k] = v;
      }
      fs.writeFileSync(filePath, JSON.stringify(clean, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ Written: ${filePath}`);
    }

    console.log('');
    console.log(`  Done! ${ids.length} themes with ${keys.length} keys → ${outDir}`);
    rl.close();
  })().catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    rl.close();
    process.exit(1);
  });
}
