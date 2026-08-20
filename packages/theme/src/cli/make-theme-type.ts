#!/usr/bin/env node
import * as path from 'node:path';
import { makeThemeType } from '../makeThemeType.js';

const args = process.argv.slice(2);
const sourceDir = args[0];
const outputDir = args[1];

if (!sourceDir || !outputDir) {
  console.error('Error: make-theme-type <source-dir> <output-dir> [options]');
  process.exit(1);
}

const watch = args.includes('--watch');
const debounceIndex = args.indexOf('--debounce');
const debounceMs = debounceIndex !== -1 ? parseInt(args[debounceIndex + 1], 10) : 500;
const fromIndex = args.indexOf('--from');
const packageName = fromIndex !== -1 ? args[fromIndex + 1] : '@cartridge-engine/theme';

if (isNaN(debounceMs) || debounceMs < 0) {
  console.error('Error: --debounce must be a non-negative number');
  process.exit(1);
}

makeThemeType({
  sourceDir: path.resolve(sourceDir),
  outputDir: path.resolve(outputDir),
  watch,
  debounceMs,
  packageName,
});
process.exit(0);
