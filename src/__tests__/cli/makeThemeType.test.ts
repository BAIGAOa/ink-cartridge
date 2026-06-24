import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  findCommonKeys,
  classifyKeys,
  escapeSingleQuote,
  generateTypesContent,
  generateRuntimeContent,
  makeThemeType,
} from '../../cli/makeThemeType.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'ink-cartridge-theme-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTheme(filePath: string, data: Record<string, unknown>): string {
  writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  return filePath;
}

describe('findCommonKeys', () => {
  it('返回所有文件的交集键', () => {
    const files = [
      { id: 'dark', values: { primary: 'cyan', bg: 'black' } },
      { id: 'light', values: { primary: 'yellow', bg: 'white' } },
    ];

    expect(findCommonKeys(files)).toEqual(['bg', 'primary']);
  });

  it('忽略只在部分文件中存在的键', () => {
    const files = [
      { id: 'a', values: { color: 'red', extra: 'x' } },
      { id: 'b', values: { color: 'blue' } },
    ];

    expect(findCommonKeys(files)).toEqual(['color']);
  });

  it('空数组返回空', () => {
    expect(findCommonKeys([])).toEqual([]);
  });
});

describe('classifyKeys', () => {
  it('string 值归类为 color，boolean 值归类为 style', () => {
    const files = [
      {
        id: 'dark',
        values: { primary: 'cyan', bg: 'black', titleBold: true, muted: false },
      },
      {
        id: 'light',
        values: { primary: 'yellow', bg: 'white', titleBold: false, muted: true },
      },
    ];

    const commonKeys = findCommonKeys(files);
    const result = classifyKeys(files, commonKeys);

    expect(result.colorKeys).toEqual(expect.arrayContaining(['primary', 'bg']));
    expect(result.styleKeys).toEqual(expect.arrayContaining(['titleBold', 'muted']));
    expect(result.colorKeys).not.toContain('titleBold');
    expect(result.styleKeys).not.toContain('primary');
  });
});

describe('generateTypesContent', () => {
  it('generates types for color and style keys', () => {
    const content = generateTypesContent(
      ['primary', 'bg', 'muted'],
      ['titleBold', 'compact'],
    );

    expect(content).toContain("export type ThemeColorKey =");
    expect(content).toContain("  | 'primary'");
    expect(content).toContain("  | 'bg'");
    expect(content).toContain("  | 'muted';");
    expect(content).toContain("export type ThemeStyleKey =");
    expect(content).toContain("  | 'titleBold'");
    expect(content).toContain("  | 'compact';");
    expect(content).toContain('export type ThemeKey = ThemeColorKey | ThemeStyleKey;');
  });

  it('handles empty keys', () => {
    const content = generateTypesContent([], []);
    expect(content).toContain('export type ThemeColorKey = never;');
    expect(content).toContain('export type ThemeStyleKey = never;');
    expect(content).toContain('export type ThemeKey = ThemeColorKey | ThemeStyleKey;');
  });

  it('escapes single quotes in key names', () => {
    const content = generateTypesContent(["person's color"], []);
    expect(content).toContain("| 'person\\'s color';");
  });
});

describe('generateRuntimeContent', () => {
  it('imports from the given package name', () => {
    const content = generateRuntimeContent('ink-cartridge');
    expect(content).toContain("import { useTheme as rawUseTheme } from 'ink-cartridge'");
    expect(content).toContain("import type { ThemeColorKey, ThemeStyleKey } from './theme-types.js'");
  });

  it('generates typed useTheme hook', () => {
    const content = generateRuntimeContent('my-pkg');
    expect(content).toContain('export function useTheme');
    expect(content).toContain('color: (key: ThemeColorKey) => string | undefined');
    expect(content).toContain('style: (key: ThemeStyleKey) => boolean | undefined');
  });
});

describe('escapeSingleQuote', () => {
  it('escapes single quotes', () => {
    expect(escapeSingleQuote("it's")).toBe("it\\'s");
  });

  it('returns plain strings unchanged', () => {
    expect(escapeSingleQuote('hello')).toBe('hello');
  });
});

describe('makeThemeType integration', () => {
  it('generates theme-types.d.ts and theme.ts from a directory of theme files', () => {
    const srcDir = path.join(tmpDir, 'themes');
    mkdirSync(srcDir, { recursive: true });

    writeTheme(path.join(srcDir, 'dark.json'), {
      id: 'dark',
      primary: 'cyan',
      bg: 'black',
      titleBold: true,
    });
    writeTheme(path.join(srcDir, 'light.json'), {
      id: 'light',
      primary: 'yellow',
      bg: 'white',
      titleBold: false,
    });

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    const runtimeFile = path.join(outDir, 'theme.ts');

    expect(fs.existsSync(typesFile)).toBe(true);
    expect(fs.existsSync(runtimeFile)).toBe(true);

    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain("'primary'");
    expect(typesContent).toContain("'bg'");
    expect(typesContent).toContain("'titleBold'");
    expect(typesContent).toContain('ThemeColorKey');
    expect(typesContent).toContain('ThemeStyleKey');

    const runtimeContent = fs.readFileSync(runtimeFile, 'utf-8');
    expect(runtimeContent).toContain('useTheme');
    expect(runtimeContent).toContain('ThemeColorKey');
    expect(runtimeContent).toContain('ThemeStyleKey');
  });

  it('works with a single theme file', () => {
    const srcDir = path.join(tmpDir, 'themes');
    mkdirSync(srcDir, { recursive: true });

    writeTheme(path.join(srcDir, 'dark.json'), {
      id: 'dark',
      primary: 'cyan',
    });

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain("'primary'");
    expect(typesContent).toContain('ThemeColorKey');
  });

  it('handles empty directory gracefully', () => {
    const srcDir = path.join(tmpDir, 'empty');
    mkdirSync(srcDir, { recursive: true });

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    expect(fs.existsSync(typesFile)).toBe(true);

    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain('ThemeColorKey = never');
    expect(typesContent).toContain('ThemeStyleKey = never');
  });

  it('ignores non-JSON files in the directory', () => {
    const srcDir = path.join(tmpDir, 'themes');
    mkdirSync(srcDir, { recursive: true });

    writeTheme(path.join(srcDir, 'dark.json'), { id: 'dark', primary: 'cyan' });
    // Write a non-JSON file
    writeFileSync(path.join(srcDir, 'README.md'), '# Themes\n');

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    expect(fs.existsSync(typesFile)).toBe(true);
  });

  it('excludes keys missing from some files from generated types', () => {
    const srcDir = path.join(tmpDir, 'themes');
    mkdirSync(srcDir, { recursive: true });

    writeTheme(path.join(srcDir, 'dark.json'), { id: 'dark', primary: 'cyan', extra: 'pink' });
    writeTheme(path.join(srcDir, 'light.json'), { id: 'light', primary: 'yellow' });

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    const typesContent = fs.readFileSync(typesFile, 'utf-8');

    // 'primary' is in both files → included
    expect(typesContent).toContain("'primary'");
    // 'extra' is only in dark.json → excluded from type
    expect(typesContent).not.toContain("'extra'");
  });

  it('classifies keys based on first file value type', () => {
    const srcDir = path.join(tmpDir, 'themes');
    mkdirSync(srcDir, { recursive: true });

    // Both files have the same keys but 'accent' is string in first, boolean in second
    writeTheme(path.join(srcDir, 'a.json'), { id: 'a', accent: 'red' });
    writeTheme(path.join(srcDir, 'b.json'), { id: 'b', accent: 'blue' });

    const outDir = path.join(tmpDir, 'typed');

    makeThemeType({
      sourceDir: srcDir,
      outputDir: outDir,
      watch: false,
      debounceMs: 500,
      packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'theme-types.d.ts');
    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    // 'accent' is string in first file → should be in ThemeColorKey
    expect(typesContent).toContain("| 'accent'");

    // Verify it's in color section (before ThemeStyleKey line)
    const colorSection = typesContent.slice(
      typesContent.indexOf('ThemeColorKey'),
      typesContent.indexOf('ThemeStyleKey'),
    );
    expect(colorSection).toContain("'accent'");
  });
});
