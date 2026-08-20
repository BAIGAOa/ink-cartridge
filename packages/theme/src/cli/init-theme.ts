#!/usr/bin/env node
import { initTheme } from '../initTheme.js';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : './themes';

initTheme({ outputDir });
