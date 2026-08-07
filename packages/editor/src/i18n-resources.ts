import { readFileSync } from "node:fs";

/**
 * Load language packs from asset/language/*.json.
 *
 * We read the files at module load instead of `import x from "./x.json"`:
 * Node ESM requires import attributes for JSON modules and tsc does not
 * emit them. Paths resolve from this module's own location (dist/), so
 * global installs work regardless of cwd — the JSON files ship inside the
 * package via the `asset` entry in `files`.
 */
const LANGUAGE_DIR = new URL("../asset/language/", import.meta.url);

function loadPack(locale: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`${locale}.json`, LANGUAGE_DIR), "utf8"),
  ) as Record<string, string>;
}

export const resources: Record<string, Record<string, string>> = {
  en: loadPack("en"),
  zh: loadPack("zh"),
};
