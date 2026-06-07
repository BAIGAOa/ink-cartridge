import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createStorage, StorageAPI } from '../../storage/index.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ink-kit-storage-'));
}

let testDir: string;
let storage: StorageAPI;

beforeEach(() => {
  testDir = tmpDir();
  storage = createStorage({ dir: testDir, file: 'test.json' });
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

function readRaw(): string {
  return fs.readFileSync(path.join(testDir, 'test.json'), 'utf-8');
}

function rawData(): Record<string, unknown> {
  return JSON.parse(readRaw());
}

describe('write / read round-trip', () => {
  it('writes and reads a number', async () => {
    await storage.write.num('volume', 80);
    expect(await storage.read.num('volume', 50)).toBe(80);
  });

  it('writes and reads a string', async () => {
    await storage.write.str('name', 'Alice');
    expect(await storage.read.str('name', 'Guest')).toBe('Alice');
  });

  it('writes and reads an object', async () => {
    await storage.write.obj('window', { width: 120, height: 40 });
    const result = await storage.read.obj('window', { width: 80, height: 24 });
    expect(result).toEqual({ width: 120, height: 40 });
  });

  it('writes and reads a boolean', async () => {
    await storage.write.b('darkMode', true);
    expect(await storage.read.b('darkMode', false)).toBe(true);
  });

  it('writes and reads an array', async () => {
    await storage.write.arr('items', [1, 2, 3]);
    expect(await storage.read.arr('items', [])).toEqual([1, 2, 3]);
  });

  it('writes and reads via any', async () => {
    await storage.write.any('flag', true);
    expect(await storage.read.any('flag', false)).toBe(true);
  });
});

describe('defaults: missing key returns default', () => {
  it('returns default for missing number', async () => {
    expect(await storage.read.num('missing', 42)).toBe(42);
  });

  it('returns default for missing string', async () => {
    expect(await storage.read.str('missing', 'fallback')).toBe('fallback');
  });

  it('returns default for missing object', async () => {
    const def = { a: 1 };
    expect(await storage.read.obj('missing', def)).toEqual({ a: 1 });
  });

  it('returns default for missing array', async () => {
    expect(await storage.read.arr('missing', [9])).toEqual([9]);
  });

  it('returns default for missing boolean', async () => {
    expect(await storage.read.b('missing', true)).toBe(true);
  });
});

describe('type mismatch → default + auto-repair', () => {
  it('number stored as string → returns default', async () => {
    await storage.write.any('vol', 'not-a-number');
    expect(await storage.read.num('vol', 100)).toBe(100);
    // file was repaired
    expect(rawData()).toEqual({ vol: 100 });
  });

  it('string stored as number → returns default', async () => {
    await storage.write.any('name', 123);
    expect(await storage.read.str('name', 'Guest')).toBe('Guest');
    expect(rawData()).toEqual({ name: 'Guest' });
  });

  it('object stored as array → returns default', async () => {
    await storage.write.any('cfg', [1, 2]);
    expect(await storage.read.obj('cfg', { key: 'val' })).toEqual({ key: 'val' });
    expect(rawData()).toEqual({ cfg: { key: 'val' } });
  });

  it('array stored as object → returns default', async () => {
    await storage.write.any('list', { a: 1 });
    expect(await storage.read.arr('list', [0])).toEqual([0]);
    expect(rawData()).toEqual({ list: [0] });
  });

  it('boolean stored as string → returns default', async () => {
    await storage.write.any('flag', 'true');
    expect(await storage.read.b('flag', false)).toBe(false);
    expect(rawData()).toEqual({ flag: false });
  });
});

describe('has / delete / clear / getAll', () => {
  it('has returns true for existing key', async () => {
    await storage.write.str('k', 'v');
    expect(await storage.has('k')).toBe(true);
    expect(await storage.has('x')).toBe(false);
  });

  it('delete removes a key', async () => {
    await storage.write.str('k', 'v');
    expect(await storage.has('k')).toBe(true);
    await storage.delete('k');
    expect(await storage.has('k')).toBe(false);
  });

  it('clear wipes all keys', async () => {
    await storage.write.str('a', '1');
    await storage.write.str('b', '2');
    await storage.clear();
    expect(await storage.getAll()).toEqual({});
  });

  it('getAll returns a shallow copy', async () => {
    await storage.write.str('x', '1');
    const all = await storage.getAll();
    expect(all).toEqual({ x: '1' });
  });
});

describe('file-level behaviours', () => {
  it('creates the data directory and file on first write', async () => {
    // after first write the file must exist
    expect(fs.existsSync(testDir)).toBe(true);
    await storage.write.str('hello', 'world');
    expect(fs.existsSync(path.join(testDir, 'test.json'))).toBe(true);
  });

  it('loads existing data from disk', async () => {
    await storage.write.num('count', 5);
    // create a new storage instance pointing to the same file
    const s2 = createStorage({ dir: testDir, file: 'test.json' });
    expect(await s2.read.num('count', 0)).toBe(5);
  });

  it('handles corrupt JSON by resetting', async () => {
    // write corrupt content directly
    fs.writeFileSync(path.join(testDir, 'test.json'), 'not-json {{{');
    const s2 = createStorage({ dir: testDir, file: 'test.json' });
    // should not throw; returns default and repairs
    expect(await s2.read.num('count', 99)).toBe(99);
    expect(rawData()).toEqual({ count: 99 });
  });

  it('handles empty file gracefully', async () => {
    fs.writeFileSync(path.join(testDir, 'test.json'), '');
    const s2 = createStorage({ dir: testDir, file: 'test.json' });
    expect(await s2.read.str('key', 'default')).toBe('default');
  });

  it('atomic write: no .tmp file left behind', async () => {
    await storage.write.num('n', 1);
    expect(fs.existsSync(path.join(testDir, 'test.json.tmp'))).toBe(false);
  });
});

describe('multiple storage stations are independent', () => {
  it('different files do not interfere', async () => {
    const a = createStorage({ dir: testDir, file: 'a.json' });
    const b = createStorage({ dir: testDir, file: 'b.json' });

    await a.write.str('key', 'from-a');
    await b.write.str('key', 'from-b');

    expect(await a.read.str('key', '')).toBe('from-a');
    expect(await b.read.str('key', '')).toBe('from-b');
  });
});
