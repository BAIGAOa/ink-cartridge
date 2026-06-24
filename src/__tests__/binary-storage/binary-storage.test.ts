import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createBinaryStorage, BinaryStorageAPI } from '../../binary-storage/index.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ink-cartridge-bin-storage-'));
}

let testDir: string;
let bin: BinaryStorageAPI;

beforeEach(() => {
  testDir = tmpDir();
  bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('write / read round-trip', () => {
  it('writes and reads a number', async () => {
    await bin.write.num(42);
    bin.resetRead();
    expect(await bin.read.num()).toBe(42);
  });

  it('writes and reads a string', async () => {
    await bin.write.str('hello');
    bin.resetRead();
    expect(await bin.read.str()).toBe('hello');
  });

  it('writes and reads a boolean', async () => {
    await bin.write.b(true);
    bin.resetRead();
    expect(await bin.read.b()).toBe(true);

    await bin.write.b(false);
    bin.resetRead();
    // seek past the first bool
    bin.seekRead(1 + 1); // tag + bool byte
    expect(await bin.read.b()).toBe(false);
  });

  it('writes and reads an object', async () => {
    await bin.write.obj({ x: 10, y: 20 });
    bin.resetRead();
    expect(await bin.read.obj<{ x: number; y: number }>()).toEqual({ x: 10, y: 20 });
  });

  it('writes and reads an array', async () => {
    await bin.write.arr([1, 2, 3]);
    bin.resetRead();
    expect(await bin.read.arr<number>()).toEqual([1, 2, 3]);
  });

  it('writes and reads null', async () => {
    await bin.write.null();
    bin.resetRead();
    expect(await bin.read.any()).toBeNull();
  });

  it('write.any auto-detects type', async () => {
    await bin.write.any(123);
    await bin.write.any('text');
    await bin.write.any(false);
    await bin.write.any({ a: 1 });
    await bin.write.any([1, 2]);
    await bin.write.any(null);

    bin.resetRead();
    expect(await bin.read.num()).toBe(123);
    expect(await bin.read.str()).toBe('text');
    expect(await bin.read.b()).toBe(false);
    expect(await bin.read.obj()).toEqual({ a: 1 });
    expect(await bin.read.arr()).toEqual([1, 2]);
    expect(await bin.read.any()).toBeNull();
  });

  it('sequential write/read without reset', async () => {
    await bin.write.num(10);
    await bin.write.num(20);
    await bin.write.num(30);

    bin.resetRead();
    expect(await bin.read.num()).toBe(10);
    expect(await bin.read.num()).toBe(20);
    expect(await bin.read.num()).toBe(30);
  });
});

describe('type mismatch errors', () => {
  it('throws when reading wrong type', async () => {
    await bin.write.str('hello');
    bin.resetRead();
    await expect(bin.read.num()).rejects.toThrow('type mismatch');
  });

  it('throws when reading number as boolean', async () => {
    await bin.write.num(1);
    bin.resetRead();
    await expect(bin.read.b()).rejects.toThrow('type mismatch');
  });
});

describe('end of stream', () => {
  it('throws reading from empty file', async () => {
    await expect(bin.read.num()).rejects.toThrow('end of stream');
  });

  it('throws reading past written values', async () => {
    await bin.write.num(1);
    bin.resetRead();
    await bin.read.num(); // consume
    await expect(bin.read.num()).rejects.toThrow('end of stream');
  });
});

describe('position management', () => {
  it('tellRead / tellWrite track correctly', async () => {
    expect(bin.tellWrite()).toBe(0);
    await bin.write.num(42);
    expect(bin.tellWrite()).toBe(1 + 8); // tag + float64
    expect(bin.tellRead()).toBe(0);
  });

  it('seekRead jumps to valid position', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);
    bin.resetRead();
    // skip first num (tag + 8 bytes)
    bin.seekRead(1 + 8);
    expect(await bin.read.num()).toBe(2);
  });

  it('seekRead throws out of range', () => {
    expect(() => bin.seekRead(-1)).toThrow();
    expect(() => bin.seekRead(9999)).toThrow();
  });

  it('resetRead goes back to start', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
  });
});

describe('seekWrite / truncate', () => {
  it('seekWrite truncates data', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);
    const posAfterTwo = (1 + 8) * 2; // 2 values
    await bin.seekWrite(posAfterTwo);
    expect(bin.tellWrite()).toBe(posAfterTwo);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    expect(await bin.read.num()).toBe(2);
    await expect(bin.read.num()).rejects.toThrow();
  });

  it('truncate cuts at read cursor', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);
    bin.resetRead();
    await bin.read.num(); // consumed 1
    await bin.truncate();
    expect(bin.tellWrite()).toBe(1 + 8);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    await expect(bin.read.num()).rejects.toThrow();
  });
});

describe('flush control', () => {
  it('flush: false batches writes', async () => {
    const b = createBinaryStorage({ dir: testDir, file: 'batch.bin', flush: false });
    await b.write.num(1);
    await b.write.num(2);
    // file should not exist or be empty
    const filePath = path.join(testDir, 'batch.bin');
    expect(() => fs.readFileSync(filePath)).toThrow(); // file not created

    await b.write.flush();
    // now file should contain both values
    const buf = fs.readFileSync(filePath);
    expect(buf.length).toBe((1 + 8) * 2);
  });
});

describe('unicode strings', () => {
  it('handles multi-byte UTF-8', async () => {
    await bin.write.str('你好世界 🌍');
    bin.resetRead();
    expect(await bin.read.str()).toBe('你好世界 🌍');
  });

  it('handles empty string', async () => {
    await bin.write.str('');
    bin.resetRead();
    expect(await bin.read.str()).toBe('');
  });
});

describe('file persistence', () => {
  it('survives reopening', async () => {
    await bin.write.num(99);
    await bin.write.str('persist');

    const bin2 = createBinaryStorage({ dir: testDir, file: 'test.bin' });
    bin2.resetRead();
    expect(await bin2.read.num()).toBe(99);
    expect(await bin2.read.str()).toBe('persist');
  });
});

describe('corrupt file handling', () => {
  it('throws on unknown type tag', async () => {
    // write corrupt data directly
    const buf = Buffer.alloc(1);
    buf.writeUInt8(0xFF, 0);
    fs.writeFileSync(path.join(testDir, 'test.bin'), buf);

    const b = createBinaryStorage({ dir: testDir, file: 'test.bin' });
    await expect(b.read.any()).rejects.toThrow('unknown type tag');
  });
});
