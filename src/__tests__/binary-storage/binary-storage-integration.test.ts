import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createBinaryStorage, BinaryStorageAPI } from '../../binary-storage/index.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ink-kit-bin-int-'));
}

let testDir: string;

beforeEach(() => {
  testDir = tmpDir();
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

/**
 * Record action frames into binary storage and replay them.
 */
describe('game replay: record → persist → play-back', () => {
  interface Frame {
    tick: number;
    action: string;
    x: number;
    y: number;
    hit: boolean;
  }

  async function recordFrames(bin: BinaryStorageAPI, frames: Frame[]): Promise<void> {
    for (const f of frames) {
      await bin.write.num(f.tick);
      await bin.write.str(f.action);
      await bin.write.num(f.x);
      await bin.write.num(f.y);
      await bin.write.b(f.hit);
    }
  }

  async function playFrames(bin: BinaryStorageAPI): Promise<Frame[]> {
    const result: Frame[] = [];
    bin.resetRead();
    while (bin.tellRead() < bin.tellWrite()) {
      result.push({
        tick:   await bin.read.num(),
        action: await bin.read.str(),
        x:      await bin.read.num(),
        y:      await bin.read.num(),
        hit:    await bin.read.b(),
      });
    }
    return result;
  }

  it('round-trips 100 frames exactly', async () => {
    const original: Frame[] = Array.from({ length: 100 }, (_, i) => ({
      tick: i,
      action: i % 3 === 0 ? 'move' : i % 3 === 1 ? 'attack' : 'defend',
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 50),
      hit: i % 5 === 0,
    }));

    const writer = createBinaryStorage({ dir: testDir, file: 'replay.bin' });
    await recordFrames(writer, original);

    // Persistence check: reopen the file
    const reader = createBinaryStorage({ dir: testDir, file: 'replay.bin' });
    const played = await playFrames(reader);

    expect(played).toEqual(original);

    // Precise byte count: each frame = 5 values
    // num(1+8) + str(varies) + num(1+8) + num(1+8) + bool(1+1)
    const expectedBytes = original.reduce((sum, f) => {
      const strBytes = Buffer.from(f.action, 'utf-8').length;
      return sum + (1+8) + (1+4+strBytes) + (1+8) + (1+8) + (1+1);
    }, 0);
    expect(reader.tellWrite()).toBe(expectedBytes);
  });

  it('partial replay: seek to tick 50', async () => {
    const frames: Frame[] = Array.from({ length: 100 }, (_, i) => ({
      tick: i,
      action: 'move',
      x: i * 2,
      y: i * 3,
      hit: false,
    }));

    const bin = createBinaryStorage({ dir: testDir, file: 'partial.bin' });
    await recordFrames(bin, frames);

    // Seek to tick 50 (skip 50 frames)
    const stride = (1+8) + (1+4+4) + (1+8) + (1+8) + (1+1); // 'move' is 4 bytes
    bin.seekRead(stride * 50);

    expect(await bin.read.num()).toBe(50);
    expect(await bin.read.str()).toBe('move');
  });
});

/**
 * Sensor data logger: high-frequency numeric writes with occasional metadata.
 */
describe('sensor logger: write many numbers, batch read back', () => {
  it('logs 10_000 temperature readings', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'sensor.bin', flush: false });

    for (let i = 0; i < 10_000; i++) {
      await bin.write.num(20 + Math.random() * 10);
    }
    await bin.write.flush();

    bin.resetRead();
    let count = 0;
    while (bin.tellRead() < bin.tellWrite()) {
      const t = await bin.read.num();
      expect(t).toBeGreaterThanOrEqual(20);
      expect(t).toBeLessThan(30);
      count++;
    }
    expect(count).toBe(10_000);
  });

  it('interleaves metadata strings with sensor data', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'sensor-meta.bin' });

    // Write: [timestamp] [event] [value] ...
    await bin.write.str('sensor-start');
    await bin.write.num(Date.now());
    await bin.write.num(25.3);
    await bin.write.num(25.7);
    await bin.write.num(26.1);
    await bin.write.str('sensor-stop');
    await bin.write.num(Date.now());

    bin.resetRead();
    expect(await bin.read.str()).toBe('sensor-start');
    const startTime = await bin.read.num();
    expect(await bin.read.num()).toBe(25.3);
    expect(await bin.read.num()).toBe(25.7);
    expect(await bin.read.num()).toBe(26.1);
    expect(await bin.read.str()).toBe('sensor-stop');
    const endTime = await bin.read.num();
    expect(endTime).toBeGreaterThanOrEqual(startTime);
  });
});

/**
 * Object serialization: store and retrieve typed configuration objects.
 */
describe('object persistence: typed config blobs', () => {
  interface PlayerState {
    name: string;
    hp: number;
    inventory: string[];
    position: { x: number; y: number };
    alive: boolean;
  }

  const defaultPlayer: PlayerState = {
    name: 'hero',
    hp: 100,
    inventory: ['sword', 'shield'],
    position: { x: 0, y: 0 },
    alive: true,
  };

  it('writes and reads a complex typed object', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'player.bin' });

    await bin.write.obj<PlayerState>(defaultPlayer);
    await bin.write.b(defaultPlayer.alive);

    bin.resetRead();
    const restored = await bin.read.obj<PlayerState>();
    const alive = await bin.read.b();

    expect(restored).toEqual(defaultPlayer);
    expect(alive).toBe(true);
  });

  it('stores array of objects as recovery points', async () => {
    const checkpoints: PlayerState[] = [
      { name: 'hero', hp: 100, inventory: [], position: { x: 0, y: 0 }, alive: true },
      { name: 'hero', hp: 80, inventory: ['potion'], position: { x: 10, y: 5 }, alive: true },
      { name: 'hero', hp: 0, inventory: ['potion'], position: { x: 30, y: 20 }, alive: false },
    ];

    const bin = createBinaryStorage({ dir: testDir, file: 'checkpoints.bin' });
    for (const cp of checkpoints) {
      await bin.write.obj<PlayerState>(cp);
    }

    bin.resetRead();
    const restored: PlayerState[] = [];
    while (bin.tellRead() < bin.tellWrite()) {
      restored.push(await bin.read.obj<PlayerState>());
    }
    expect(restored).toEqual(checkpoints);
  });
});

/**
 * Chat log: sequential write, append-only reopen.
 */
describe('chat log: append-only sequential messages', () => {
  interface ChatMessage {
    sender: string;
    text: string;
    ts: number;
  }

  it('appends messages across multiple sessions', async () => {
    const fileOpts = { dir: testDir, file: 'chat.bin' };

    // Session 1: two messages
    const s1 = createBinaryStorage(fileOpts);
    await s1.write.obj<ChatMessage>({ sender: 'Alice', text: 'hello', ts: 1000 });
    await s1.write.obj<ChatMessage>({ sender: 'Bob', text: 'hi!', ts: 1001 });

    // Session 2: append one more
    const s2 = createBinaryStorage(fileOpts);
    await s2.write.obj<ChatMessage>({ sender: 'Alice', text: 'how are you?', ts: 1005 });

    // Read all
    const reader = createBinaryStorage(fileOpts);
    reader.resetRead();
    const msgs: ChatMessage[] = [];
    while (reader.tellRead() < reader.tellWrite()) {
      msgs.push(await reader.read.obj<ChatMessage>());
    }

    expect(msgs).toHaveLength(3);
    expect(msgs[0].sender).toBe('Alice');
    expect(msgs[2].text).toBe('how are you?');
  });
});

/**
 * Mixed-type stream with write.any / read.any.
 */
describe('mixed-type stream: any → any round-trip', () => {
  it('write.any auto-detects and read.any restores values', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'mixed.bin' });

    const values: unknown[] = [42, 'hello', true, null, { a: 1 }, [1, 2, 3], 3.14, '', false];
    for (const v of values) {
      await bin.write.any(v);
    }

    bin.resetRead();
    const restored: unknown[] = [];
    while (bin.tellRead() < bin.tellWrite()) {
      restored.push(await bin.read.any());
    }
    expect(restored).toEqual(values);
  });
});

/**
 * Truncate / seekWrite: rollback scenarios.
 */
describe('rollback: seekWrite to undo', () => {
  it('undoes the last 3 writes by seeking back', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'undo.bin' });

    await bin.write.num(1);
    await bin.write.num(2);
    const posAfterTwo = bin.tellWrite();
    await bin.write.num(3);
    await bin.write.num(4);
    await bin.write.num(5);

    // Undo: seekWrite back to after the second value
    await bin.seekWrite(posAfterTwo);

    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    expect(await bin.read.num()).toBe(2);
    await expect(bin.read.num()).rejects.toThrow();
  });

  it('truncate discards already-consumed values', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'trunc.bin' });
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);
    await bin.write.num(4);

    // Read first two
    bin.resetRead();
    await bin.read.num();
    await bin.read.num();
    // Truncate at current read position (discard the last two)
    await bin.truncate();

    expect(bin.tellWrite()).toBe((1 + 8) * 2); // two values remain
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    expect(await bin.read.num()).toBe(2);
    await expect(bin.read.num()).rejects.toThrow();
  });
});

/**
 * Multi-station isolation.
 */
describe('multi-station: concurrent independent stations', () => {
  it('two stations in different files do not interfere', async () => {
    const a = createBinaryStorage({ dir: testDir, file: 'a.bin' });
    const b = createBinaryStorage({ dir: testDir, file: 'b.bin' });

    await a.write.num(111);
    await b.write.num(222);

    a.resetRead();
    b.resetRead();
    expect(await a.read.num()).toBe(111);
    expect(await b.read.num()).toBe(222);
  });

  it('two stations on the same file share data', async () => {
    const opts = { dir: testDir, file: 'shared.bin' };

    const producer = createBinaryStorage(opts);
    await producer.write.str('msg1');
    await producer.write.str('msg2');

    const consumer = createBinaryStorage(opts);
    consumer.resetRead();
    expect(await consumer.read.str()).toBe('msg1');
    expect(await consumer.read.str()).toBe('msg2');
  });
});

/**
 * Unicode / edge cases.
 */
describe('unicode & edge cases', () => {
  it('round-trips exotic Unicode strings', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'unicode.bin' });
    const strings = [
      'こんにちは',
      '✨ emoji and 中文 mixed 💯',
      '\u0000 null byte in middle',
      'a'.repeat(10_000), // 10k char string
    ];

    for (const s of strings) {
      await bin.write.str(s);
    }

    bin.resetRead();
    for (const s of strings) {
      expect(await bin.read.str()).toBe(s);
    }
  });

  it('special number values', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'special-nums.bin' });
    await bin.write.num(Infinity);
    await bin.write.num(-Infinity);
    await bin.write.num(Number.MAX_SAFE_INTEGER);
    await bin.write.num(Number.MIN_SAFE_INTEGER);
    await bin.write.num(0);
    await bin.write.num(-0);

    bin.resetRead();
    expect(await bin.read.num()).toBe(Infinity);
    expect(await bin.read.num()).toBe(-Infinity);
    expect(await bin.read.num()).toBe(Number.MAX_SAFE_INTEGER);
    expect(await bin.read.num()).toBe(Number.MIN_SAFE_INTEGER);
    expect(await bin.read.num()).toBe(0);
    // -0 reads back as 0 in JS (IEEE 754 equality); just verify it's 0
    const negZero = await bin.read.num();
    expect(Object.is(negZero, -0)).toBe(true);
  });
});

/**
 * Seek accuracy: record positions, jump back precisely.
 */
describe('seek bookmarking: record positions and replay segments', () => {
  it('bookmarks and seeks to chapter boundaries', async () => {
    const bin = createBinaryStorage({ dir: testDir, file: 'chapters.bin' });
    const chapterStarts: number[] = [];

    // Chapter 1
    chapterStarts.push(bin.tellWrite());
    await bin.write.str('Chapter One');
    await bin.write.num(1000);
    await bin.write.num(2000);

    // Chapter 2
    chapterStarts.push(bin.tellWrite());
    await bin.write.str('Chapter Two');
    await bin.write.num(3000);
    await bin.write.num(4000);

    // Chapter 3
    chapterStarts.push(bin.tellWrite());
    await bin.write.str('Chapter Three');
    await bin.write.num(5000);
    await bin.write.num(6000);

    // Seek to chapter 2
    bin.seekRead(chapterStarts[1]);
    expect(await bin.read.str()).toBe('Chapter Two');
    expect(await bin.read.num()).toBe(3000);

    // Seek to chapter 3
    bin.seekRead(chapterStarts[2]);
    expect(await bin.read.str()).toBe('Chapter Three');
    expect(await bin.read.num()).toBe(5000);

    // Seek to chapter 1
    bin.seekRead(chapterStarts[0]);
    expect(await bin.read.str()).toBe('Chapter One');
    expect(await bin.read.num()).toBe(1000);
  });
});

/**
 * Boundary conditions: edge positions, zero-length content, empty streams.
 */
describe('boundary conditions', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('seekRead to exact writePos (empty readable region)', () => {
    // seekRead(pos) where pos === writePos should succeed (no range error),
    // but the next read should throw end-of-stream
    bin.seekRead(0); // empty file
    expect(bin.tellRead()).toBe(0);
    expect(bin.tellWrite()).toBe(0);
  });

  it('seekWrite(0) clears entire file, then rewrite', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);

    await bin.seekWrite(0);
    expect(bin.tellWrite()).toBe(0);
    expect(bin.tellRead()).toBe(0);

    // Rewrite from scratch
    await bin.write.str('fresh');
    bin.resetRead();
    expect(await bin.read.str()).toBe('fresh');
    await expect(bin.read.any()).rejects.toThrow('end of stream');
  });

  it('read.any on empty stream throws end-of-stream', async () => {
    await expect(bin.read.any()).rejects.toThrow('end of stream');
    expect(bin.tellRead()).toBe(0); // position unchanged
  });

  it('read.num on empty stream throws end-of-stream', async () => {
    await expect(bin.read.num()).rejects.toThrow('end of stream');
  });

  it('seekRead to writePos succeeds but next read fails', async () => {
    await bin.write.num(42);
    bin.seekRead(bin.tellWrite()); // at the end
    await expect(bin.read.any()).rejects.toThrow('end of stream');
  });

  it('write then re-read multiple times from same position', async () => {
    await bin.write.num(100);
    await bin.write.str('test');

    // Re-read from start twice
    for (let i = 0; i < 3; i++) {
      bin.resetRead();
      expect(await bin.read.num()).toBe(100);
      expect(await bin.read.str()).toBe('test');
    }
  });
});

/**
 * Write concurrency: multiple writes fired without await.
 */
describe('write ordering under concurrency', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('fires many writes without await and reads correct order', async () => {
    bin.write.num(1);
    bin.write.num(2);
    bin.write.num(3);
    bin.write.str('four');
    bin.write.b(true);
    await bin.write.null(); // last one awaited to flush

    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    expect(await bin.read.num()).toBe(2);
    expect(await bin.read.num()).toBe(3);
    expect(await bin.read.str()).toBe('four');
    expect(await bin.read.b()).toBe(true);
    expect(await bin.read.any()).toBeNull();
  });
});

/**
 * NaN and special IEEE 754 values.
 */
describe('special IEEE 754 values', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('NaN round-trips (checks with isNaN)', async () => {
    await bin.write.num(NaN);
    bin.resetRead();
    const val = await bin.read.num();
    expect(Number.isNaN(val)).toBe(true);
  });

  it('Number.EPSILON (smallest difference)', async () => {
    await bin.write.num(Number.EPSILON);
    bin.resetRead();
    expect(await bin.read.num()).toBe(Number.EPSILON);
  });

  it('Number.MIN_VALUE (smallest positive)', async () => {
    await bin.write.num(Number.MIN_VALUE);
    bin.resetRead();
    // 0 is returned for denormalised values -> actually 5e-324 should survive
    const val = await bin.read.num();
    expect(val).toBe(Number.MIN_VALUE);
  });

  it('integer boundaries', async () => {
    const ints = [0, 1, -1, 2 ** 31 - 1, -(2 ** 31), 2 ** 53 - 1, -(2 ** 53)];
    for (const n of ints) await bin.write.num(n);

    bin.resetRead();
    for (const n of ints) {
      expect(await bin.read.num()).toBe(n);
    }
  });
});

/**
 * Deeply nested objects and arrays.
 */
describe('deep JSON structures', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('deeply nested object', async () => {
    const deep = { a: { b: { c: { d: { e: 'bottom' } } } } };
    await bin.write.obj(deep);
    bin.resetRead();
    expect(await bin.read.obj()).toEqual(deep);
  });

  it('nested arrays', async () => {
    const nested = [[1, 2], [3, [4, 5]], []];
    await bin.write.arr(nested);
    bin.resetRead();
    expect(await bin.read.arr()).toEqual(nested);
  });

  it('object containing array containing object', async () => {
    const complex = { players: [{ name: 'Alice', scores: [10, 20] }, { name: 'Bob', scores: [5] }] };
    await bin.write.obj(complex);
    bin.resetRead();
    expect(await bin.read.obj()).toEqual(complex);
  });

  it('object with null fields', async () => {
    const withNull = { a: null, b: 1, c: null };
    await bin.write.obj(withNull);
    bin.resetRead();
    expect(await bin.read.obj()).toEqual(withNull);
  });
});

/**
 * Corruption: manual file tampering and recovery scenarios.
 */
describe('corruption detection', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('detects wrong tag for typed read', async () => {
    await bin.write.num(1);
    bin.resetRead();
    // try reading number as string
    await expect(bin.read.str()).rejects.toThrow('type mismatch');
    await expect(bin.read.str()).rejects.toThrow('Expected string, got number');
    // read position unchanged after failed read
    expect(bin.tellRead()).toBe(0);
  });

  it('read.any survives and reports position correctly', async () => {
    await bin.write.num(1);
    await bin.write.str('hello');
    bin.resetRead();
    expect(await bin.read.any()).toBe(1);
    expect(bin.tellRead()).toBe(1 + 8); // past the number
    expect(await bin.read.any()).toBe('hello');
  });

  it('manually corrupting file with invalid tag', async () => {
    // Write valid data, then corrupt it on disk
    const bad = createBinaryStorage({ dir: testDir, file: 'corrupt.bin' });
    await bad.write.num(1);
    // overwrite first byte with 0xFF
    const filePath = path.join(testDir, 'corrupt.bin');
    const buf = fs.readFileSync(filePath);
    buf.writeUInt8(0xFF, 0);
    fs.writeFileSync(filePath, buf);

    const reader = createBinaryStorage({ dir: testDir, file: 'corrupt.bin' });
    await expect(reader.read.any()).rejects.toThrow('unknown type tag');
  });
});

/**
 * Cursor manipulation edge cases.
 */
describe('cursor manipulation edge cases', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('seekRead to middle of number → garbage read', async () => {
    await bin.write.num(42);
    // seek to byte 1 (middle of float64)
    bin.seekRead(1);
    // reading a tag from mid-number bytes produces garbage tag
    await expect(bin.read.num()).rejects.toThrow();
  });

  it('seekWrite with readPos clamping', async () => {
    await bin.write.num(1);
    await bin.write.num(2);
    await bin.write.num(3);
    bin.resetRead();
    await bin.read.num(); // readPos = 9
    await bin.read.num(); // readPos = 18

    // seekWrite to before readPos — readPos should clamp
    await bin.seekWrite(9);
    expect(bin.tellRead()).toBe(9); // clamped from 18 to 9
    expect(bin.tellWrite()).toBe(9);
  });

  it('seekRead to 0, then write more, then read all', async () => {
    await bin.write.num(1);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    // Now write more
    await bin.write.num(2);
    await bin.write.num(3);
    bin.resetRead();
    expect(await bin.read.num()).toBe(1);
    expect(await bin.read.num()).toBe(2);
    expect(await bin.read.num()).toBe(3);
  });
});

/**
 * Truncation after mixed reads.
 */
describe('truncation with partial reads', () => {
  let bin: BinaryStorageAPI;

  beforeEach(() => {
    bin = createBinaryStorage({ dir: testDir, file: 'test.bin' });
  });

  it('read half, truncate, read remaining', async () => {
    await bin.write.str('keep');
    await bin.write.str('discard');
    await bin.write.str('also-discard');

    bin.resetRead();
    expect(await bin.read.str()).toBe('keep');
    await bin.truncate();

    // Only 'keep' should remain
    const reopen = createBinaryStorage({ dir: testDir, file: 'test.bin' });
    reopen.resetRead();
    expect(await reopen.read.str()).toBe('keep');
    await expect(reopen.read.any()).rejects.toThrow();
  });
});

/**
 * Performance sanity: large sequences.
 */
describe('large sequences', () => {
  it('round-trips 2000 mixed values', async () => {
    const bin2 = createBinaryStorage({ dir: testDir, file: 'large.bin', flush: false });

    const original: Array<{ type: string; value: unknown }> = [];
    for (let i = 0; i < 500; i++) {
      await bin2.write.num(i);
      original.push({ type: 'num', value: i });
      await bin2.write.str(`msg-${i}`);
      original.push({ type: 'str', value: `msg-${i}` });
      await bin2.write.b(i % 2 === 0);
      original.push({ type: 'bool', value: i % 2 === 0 });
      await bin2.write.null();
      original.push({ type: 'null', value: null });
    }
    await bin2.write.flush();

    const reader = createBinaryStorage({ dir: testDir, file: 'large.bin' });
    reader.resetRead();
    for (let i = 0; i < original.length; i++) {
      const entry = original[i];
      switch (entry.type) {
        case 'num':  expect(await reader.read.num()).toBe(entry.value); break;
        case 'str':  expect(await reader.read.str()).toBe(entry.value); break;
        case 'bool': expect(await reader.read.b()).toBe(entry.value); break;
        case 'null': expect(await reader.read.any()).toBeNull(); break;
      }
    }
    expect(reader.tellRead()).toBe(reader.tellWrite());
  });
});
