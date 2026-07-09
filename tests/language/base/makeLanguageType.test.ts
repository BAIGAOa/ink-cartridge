import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

type LangFile = { name: string; keys: Record<string, string> };

import {
  flatJSON,
  findCommonKeys,
  findPartialKeys,
  extractParams,
  paramSetsForKey,
  escapeSingleQuote,
  generateTypesContent,
  generateRuntimeContent,
  makeLanguageType,
} from '../../../src/cli/makeLanguageType.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'ink-lang-type-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeLocale(filePath: string, data: Record<string, unknown>): string {
  writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  return filePath;
}

describe('flatJSON', () => {
  it('flattens a shallow object', () => {
    expect(flatJSON({ a: '1', b: '2' })).toEqual({ a: '1', b: '2' });
  });

  it('flattens nested keys into dot notation', () => {
    expect(flatJSON({ menu: { title: 'Main', sub: 'Sub' } }))
      .toEqual({ 'menu.title': 'Main', 'menu.sub': 'Sub' });
  });

  it('converts numbers to strings', () => {
    expect(flatJSON({ count: 42 })).toEqual({ count: '42' });
  });

  it('converts booleans to strings', () => {
    expect(flatJSON({ active: true, inactive: false }))
      .toEqual({ active: 'true', inactive: 'false' });
  });

  it('converts arrays to comma-separated strings', () => {
    expect(flatJSON({ items: ['a', 'b', 'c'] })).toEqual({ items: 'a, b, c' });
  });

  it('skips null values', () => {
    expect(flatJSON({ a: 'val', b: null })).toEqual({ a: 'val' });
  });

  it('skips empty objects', () => {
    expect(flatJSON({ a: 'val', b: {} })).toEqual({ a: 'val' });
  });

  it('handles deep nesting with mixed types', () => {
    const input = { user: { name: 'Alice', stats: { hp: 100, dead: false }, tags: ['a', 'b'] } };
    expect(flatJSON(input)).toEqual({
      'user.name': 'Alice',
      'user.stats.hp': '100',
      'user.stats.dead': 'false',
      'user.tags': 'a, b',
    });
  });

  it('returns empty for empty input', () => {
    expect(flatJSON({})).toEqual({});
  });
});

describe('findCommonKeys', () => {
  it('returns keys present in all files, sorted', () => {
    const files = [
      { name: 'en-US', keys: { hello: 'Hello', bye: 'Bye' } },
      { name: 'zh-CN', keys: { bye: '再见', hello: '你好' } },
    ];
    expect(findCommonKeys(files)).toEqual(['bye', 'hello']);
  });

  it('returns empty when no keys are common', () => {
    const files: LangFile[] = [
      { name: 'en-US', keys: { a: 'A' } },
      { name: 'zh-CN', keys: { b: 'B' } },
    ];
    expect(findCommonKeys(files)).toEqual([]);
  });

  it('returns all keys with a single file', () => {
    const files = [{ name: 'en-US', keys: { x: 'X', y: 'Y' } }];
    expect(findCommonKeys(files)).toEqual(['x', 'y']);
  });

  it('returns empty for empty file list', () => {
    expect(findCommonKeys([])).toEqual([]);
  });

  it('handles three files with different overlaps', () => {
    const files: LangFile[] = [
      { name: 'a', keys: { shared: '1', onlyA: '2' } },
      { name: 'b', keys: { shared: '3', onlyB: '4' } },
      { name: 'c', keys: { shared: '5', onlyC: '6' } },
    ];
    expect(findCommonKeys(files)).toEqual(['shared']);
  });

  it('handles files with no keys', () => {
    const files = [
      { name: 'a', keys: {} },
      { name: 'b', keys: {} },
    ];
    expect(findCommonKeys(files)).toEqual([]);
  });

  it('returns sorted regardless of insertion order', () => {
    const files = [
      { name: 'en-US', keys: { zebra: 'z', apple: 'a' } },
      { name: 'zh-CN', keys: { apple: '啊', zebra: '字' } },
    ];
    expect(findCommonKeys(files)).toEqual(['apple', 'zebra']);
  });
});

describe('findPartialKeys', () => {
  it('returns keys missing from some files with file names', () => {
    const files: LangFile[] = [
      { name: 'en-US', keys: { hello: 'Hello', bye: 'Bye' } },
      { name: 'zh-CN', keys: { hello: '你好' } },
    ];
    const result = findPartialKeys(files);
    expect(result.has('bye')).toBe(true);
    expect(result.get('bye')).toContain('zh-CN');
  });

  it('returns empty when all keys are shared', () => {
    const files = [
      { name: 'en-US', keys: { hello: 'Hello' } },
      { name: 'zh-CN', keys: { hello: '你好' } },
    ];
    expect(findPartialKeys(files).size).toBe(0);
  });

  it('returns empty for empty file list', () => {
    expect(findPartialKeys([]).size).toBe(0);
  });

  it('identifies which files are missing each key among 3+ files', () => {
    const files: LangFile[] = [
      { name: 'a', keys: { x: '1' } },
      { name: 'b', keys: { x: '2' } },
      { name: 'c', keys: { y: '3' } },
    ];
    const result = findPartialKeys(files);
    expect(result.get('x')).toContain('c');
    expect(result.get('y')).toContain('a');
    expect(result.get('y')).toContain('b');
  });
});

describe('extractParams', () => {
  it('extracts a simple {name} parameter', () => {
    expect(extractParams('Hello {name}')).toEqual(['name']);
  });

  it('extracts multiple parameters', () => {
    expect(extractParams('{a} and {b}')).toEqual(['a', 'b']);
  });

  it('returns empty when no parameters', () => {
    expect(extractParams('Hello World')).toEqual([]);
  });

  it('deduplicates repeated parameter names', () => {
    expect(extractParams('{x} {x}')).toEqual(['x']);
  });

  it('handles empty string', () => {
    expect(extractParams('')).toEqual([]);
  });

  it('extracts parameters with underscores', () => {
    expect(extractParams('{user_name}')).toEqual(['user_name']);
  });

  it('extracts from double braces', () => {
    expect(extractParams('{{x}}')).toEqual(['x']);
  });
});

describe('paramSetsForKey', () => {
  it('returns union of params across files', () => {
    const files = [
      { name: 'en-US', keys: { welcome: 'Hello {name} from {city}' } },
      { name: 'zh-CN', keys: { welcome: '{name}你好' } },
    ];
    const result = paramSetsForKey('welcome', files);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.arrayContaining(['city', 'name']));
    expect(result[1]).toEqual(['name']);
  });

  it('returns empty array for missing key', () => {
    const result = paramSetsForKey('nonexistent', []);
    expect(result).toEqual([]);
  });

  it('returns empty array for key with no params', () => {
    const files = [{ name: 'en-US', keys: { hello: 'Hello' } }];
    const result = paramSetsForKey('hello', files);
    expect(result).toEqual([[]]);
  });
});

describe('escapeSingleQuote', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeSingleQuote('hello')).toBe('hello');
  });

  it('escapes single quotes', () => {
    expect(escapeSingleQuote("it's")).toBe("it\\'s");
  });

  it('handles multiple single quotes', () => {
    expect(escapeSingleQuote("it's a 'test'")).toBe("it\\'s a \\'test\\'");
  });

  it('handles empty string', () => {
    expect(escapeSingleQuote('')).toBe('');
  });
});

describe('generateTypesContent', () => {
  it('generates TranslationKey union from common keys', () => {
    const content = generateTypesContent(['hello', 'bye'], {});
    expect(content).toContain("export type TranslationKey =");
    expect(content).toContain("  | 'hello'");
    expect(content).toContain("  | 'bye';");
  });

  it('generates never when no common keys', () => {
    const content = generateTypesContent([], {});
    expect(content).toContain('  never;');
  });

  it('generates TranslationParams with undefined for param-less keys', () => {
    const content = generateTypesContent(['hello'], { hello: [] });
    expect(content).toContain("'hello': undefined");
  });

  it('generates TranslationParams with param types', () => {
    const content = generateTypesContent(['welcome'], { welcome: ['name', 'city'] });
    expect(content).toContain("'welcome': {");
    expect(content).toContain("name: string | number");
    expect(content).toContain("city: string | number");
  });

  it('produces valid TypeScript syntax with closing semicolons', () => {
    const content = generateTypesContent(['k'], { k: [] });
    expect(content).toMatch(/;$/m);
  });
});

describe('generateRuntimeContent', () => {
  it('imports from the given package', () => {
    const content = generateRuntimeContent('ink-cartridge');
    expect(content).toContain("import { useI18n as rawUseI18n } from 'ink-cartridge'");
  });

  it('imports from custom package', () => {
    const content = generateRuntimeContent('my-pkg');
    expect(content).toContain("from 'my-pkg'");
  });

  it('imports i18n-types from relative path', () => {
    const content = generateRuntimeContent('ink-cartridge');
    expect(content).toContain("import type { TranslationKey, TranslationParams } from './i18n-types.js'");
  });

  it('exports typed t function with generic K', () => {
    const content = generateRuntimeContent('pkg');
    expect(content).toContain('export function t<K extends TranslationKey>');
  });

  it('exports typed useI18n hook', () => {
    const content = generateRuntimeContent('pkg');
    expect(content).toContain('export function useI18n');
  });

  it('handles single quotes in package name', () => {
    const content = generateRuntimeContent("someone's-pkg");
    expect(content).toContain("'someone\\'s-pkg'");
  });
});

describe('makeLanguageType integration', () => {
  it('generates type files from locale JSON files', () => {
    const srcDir = path.join(tmpDir, 'locales');
    mkdirSync(srcDir, { recursive: true });

    writeLocale(path.join(srcDir, 'en-US.json'), { hello: 'Hello', bye: 'Bye' });
    writeLocale(path.join(srcDir, 'zh-CN.json'), { hello: '你好', bye: '再见' });

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'i18n-types.d.ts');
    const runtimeFile = path.join(outDir, 'i18n.ts');

    expect(fs.existsSync(typesFile)).toBe(true);
    expect(fs.existsSync(runtimeFile)).toBe(true);

    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain("'hello'");
    expect(typesContent).toContain("'bye'");
    expect(typesContent).toContain('TranslationKey');

    const runtimeContent = fs.readFileSync(runtimeFile, 'utf-8');
    expect(runtimeContent).toContain('useI18n');
  });

  it('warns about partial keys', () => {
    const srcDir = path.join(tmpDir, 'locales');
    mkdirSync(srcDir, { recursive: true });

    writeLocale(path.join(srcDir, 'en-US.json'), { hello: 'Hello', extra: 'Extra' });
    writeLocale(path.join(srcDir, 'zh-CN.json'), { hello: '你好' });

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'ink-cartridge',
    });

    const typesContent = fs.readFileSync(path.join(outDir, 'i18n-types.d.ts'), 'utf-8');
    expect(typesContent).toContain("'hello'");
    expect(typesContent).not.toContain("'extra'");
  });

  it('handles empty directory', () => {
    const srcDir = path.join(tmpDir, 'empty');
    mkdirSync(srcDir, { recursive: true });

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'ink-cartridge',
    });

    const typesFile = path.join(outDir, 'i18n-types.d.ts');
    expect(fs.existsSync(typesFile)).toBe(true);
    const typesContent = fs.readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain('  never;');
  });

  it('generates params from union across all files', () => {
    const srcDir = path.join(tmpDir, 'locales');
    mkdirSync(srcDir, { recursive: true });

    writeLocale(path.join(srcDir, 'en-US.json'), { welcome: 'Hello {name}' });
    writeLocale(path.join(srcDir, 'zh-CN.json'), { welcome: '{name}你好' });

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'ink-cartridge',
    });

    const typesContent = fs.readFileSync(path.join(outDir, 'i18n-types.d.ts'), 'utf-8');
    expect(typesContent).toContain('name');
  });

  it('uses custom package name in runtime', () => {
    const srcDir = path.join(tmpDir, 'locales');
    mkdirSync(srcDir, { recursive: true });

    writeLocale(path.join(srcDir, 'en-US.json'), { hello: 'Hello' });

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'my-lib',
    });

    const runtimeContent = fs.readFileSync(path.join(outDir, 'i18n.ts'), 'utf-8');
    expect(runtimeContent).toContain("from 'my-lib'");
  });

  it('ignores non-JSON files', () => {
    const srcDir = path.join(tmpDir, 'locales');
    mkdirSync(srcDir, { recursive: true });

    writeLocale(path.join(srcDir, 'en-US.json'), { hello: 'Hello' });
    writeFileSync(path.join(srcDir, 'README.md'), '# Locales\n');

    const outDir = path.join(tmpDir, 'out');
    makeLanguageType({
      sourceDir: srcDir, outputDir: outDir,
      watch: false, debounceMs: 500, packageName: 'ink-cartridge',
    });

    expect(fs.existsSync(path.join(outDir, 'i18n-types.d.ts'))).toBe(true);
  });
});
