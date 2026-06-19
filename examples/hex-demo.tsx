/**
 * Interactive BinaryStorage hex viewer.
 *
 * Run: npx tsx projectTest/hex-demo.tsx (from project root)
 *
 * Generates ~/ink-hex-demo.bin with all written values.
 * Inspect the file anytime with: xxd ~/ink-hex-demo.bin
 */
import React, { useState, useRef, useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as process from 'node:process';
import { createBinaryStorage, TypeTag } from '../src/binary-storage/index.js';

// Parse buffer into annotated entries for display

interface Entry {
  offset: number;
  hexBytes: string;
  tagName: string;
  decoded: string;
  byteCount: number;
}

const TAG_INFO: Record<number, { name: string; color: string }> = {
  [TypeTag.Number]:  { name: 'Number',  color: 'cyan' },
  [TypeTag.String]:  { name: 'String',  color: 'green' },
  [TypeTag.Boolean]: { name: 'Boolean', color: 'yellow' },
  [TypeTag.Object]:  { name: 'Object',  color: 'magenta' },
  [TypeTag.Array]:   { name: 'Array',   color: 'magenta' },
  [TypeTag.Null]:    { name: 'Null',    color: 'gray' },
};

const TAG_COLORS: Record<string, string> = {
  cyan:    '#00FFFF',
  green:   '#00FF7F',
  yellow:  '#FFD700',
  magenta: '#FF69B4',
  gray:    '#888888',
};

const TAG_BG: Record<string, string> = {
  cyan:    '#004444',
  green:   '#004400',
  yellow:  '#444400',
  magenta: '#440044',
  gray:    '#333333',
};

function formatHex(buf: Buffer): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function parseEntries(buf: Buffer): Entry[] {
  const entries: Entry[] = [];
  let pos = 0;

  while (pos < buf.length) {
    const start = pos;
    const tag = buf.readUInt8(pos);
    const allBytes: number[] = [tag];
    pos++;

    switch (tag) {
      case TypeTag.Number: {
        const v = buf.readDoubleLE(pos);
        for (let i = 0; i < 8; i++) allBytes.push(buf[pos + i]!);
        pos += 8;
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from(allBytes)), tagName: 'Number', decoded: String(v), byteCount: allBytes.length });
        break;
      }
      case TypeTag.String: {
        const len = buf.readUInt32LE(pos);
        for (let i = 0; i < 4; i++) allBytes.push(buf[pos + i]!);
        pos += 4;
        const strBytes: number[] = [];
        for (let i = 0; i < len; i++) { const b = buf[pos + i]!; allBytes.push(b); strBytes.push(b); }
        pos += len;
        const str = Buffer.from(strBytes).toString('utf-8');
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from(allBytes)), tagName: 'String', decoded: JSON.stringify(str), byteCount: allBytes.length });
        break;
      }
      case TypeTag.Boolean: {
        const v = buf.readUInt8(pos) !== 0;
        allBytes.push(buf[pos]!);
        pos++;
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from(allBytes)), tagName: 'Boolean', decoded: String(v), byteCount: allBytes.length });
        break;
      }
      case TypeTag.Object: {
        const len = buf.readUInt32LE(pos);
        for (let i = 0; i < 4; i++) allBytes.push(buf[pos + i]!);
        pos += 4;
        const jsonBytes: number[] = [];
        for (let i = 0; i < len; i++) { const b = buf[pos + i]!; allBytes.push(b); jsonBytes.push(b); }
        pos += len;
        const json = Buffer.from(jsonBytes).toString('utf-8');
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from(allBytes)), tagName: 'Object', decoded: json, byteCount: allBytes.length });
        break;
      }
      case TypeTag.Array: {
        const len = buf.readUInt32LE(pos);
        for (let i = 0; i < 4; i++) allBytes.push(buf[pos + i]!);
        pos += 4;
        const jsonBytes: number[] = [];
        for (let i = 0; i < len; i++) { const b = buf[pos + i]!; allBytes.push(b); jsonBytes.push(b); }
        pos += len;
        const json = Buffer.from(jsonBytes).toString('utf-8');
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from(allBytes)), tagName: 'Array', decoded: json, byteCount: allBytes.length });
        break;
      }
      case TypeTag.Null: {
        entries.push({ offset: start, hexBytes: formatHex(Buffer.from([tag])), tagName: 'Null', decoded: 'null', byteCount: 1 });
        break;
      }
    }
  }
  return entries;
}

// Ink component — renders live hex viewer

function HexViewer() {
  const dirRef = useRef(os.homedir());
  const filePath = path.join(dirRef.current, 'ink-hex-demo.bin');
  const storageRef = useRef(createBinaryStorage({ dir: dirRef.current, file: 'ink-hex-demo.bin', flush: true }));

  const [entries, setEntries] = useState<Entry[]>([]);
  const [fileSize, setFileSize] = useState(0);
  const [lastOp, setLastOp] = useState('ready — press a key to write');

  const refresh = useCallback(() => {
    try {
      const buf = fs.readFileSync(filePath);
      setFileSize(buf.length);
      setEntries(parseEntries(buf));
    } catch {
      setFileSize(0);
      setEntries([]);
    }
  }, [filePath]);

  useInput(async (input, _key) => {
    const s = storageRef.current;
    try {
      if (input === 'n') {
        const v = +(Math.random() * 1000).toFixed(1);
        await s.write.num(v);
        setLastOp(`write.num(${v})`);
      } else if (input === 's') {
        const words = ['hello', 'world', 'ink', 'binary', 'storage', 'demo', 'multibyte'];
        const w = words[Math.floor(Math.random() * words.length)]!;
        await s.write.str(w);
        const display = w.length > 20 ? w.slice(0, 17) + '...' : w;
        setLastOp(`write.str(${JSON.stringify(display)})`);
      } else if (input === 'b') {
        const v = Math.random() > 0.5;
        await s.write.b(v);
        setLastOp(`write.b(${v})`);
      } else if (input === 'o') {
        const obj = { ts: Date.now(), r: +(Math.random() * 100).toFixed(2) };
        await s.write.obj(obj);
        setLastOp(`write.obj(${JSON.stringify(obj)})`);
      } else if (input === 'a') {
        const arr = [Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)];
        await s.write.arr(arr);
        setLastOp(`write.arr(${JSON.stringify(arr)})`);
      } else if (input === 'l') {
        await s.write.null();
        setLastOp('write.null()');
      } else if (input === 'r') {
        s.resetRead();
        setLastOp('resetRead() — cursor back to 0');
      } else if (input === 'c') {
        await s.seekWrite(0);
        setLastOp('seekWrite(0) — cleared!');
      } else if (input === 'q') {
        process.stderr.write('\nBinary file saved at: ~/ink-hex-demo.bin\n');
        process.stderr.write('Inspect it: xxd ~/ink-hex-demo.bin\n\n');
        process.exit(0);
      }
      refresh();
    } catch (err) {
      setLastOp(`Error: ${(err as Error).message}`);
    }
  });

  const cols = Math.min(process.stdout.columns ?? 80, 100);
  const sizeStr = fileSize < 1024 ? `${fileSize} B` : `${(fileSize / 1024).toFixed(1)} KiB`;

  return (
    <Box flexDirection="column">
      <Box><Text backgroundColor="#000088" color="white" bold> BinaryStorage — Live Hex Viewer </Text></Box>

      <Box marginTop={1}>
        <Text dimColor>File: </Text><Text bold>{filePath}</Text>
        <Text>  </Text><Text dimColor>Size: </Text>
        <Text bold color={fileSize > 0 ? 'green' : 'gray'}>{sizeStr}</Text>
        <Text>  </Text><Text dimColor>Last: </Text><Text italic>{lastOp}</Text>
      </Box>

      <Box marginTop={1}><Text dimColor>{'─'.repeat(cols)}</Text></Box>

      {entries.length === 0 && <Box marginTop={1}><Text dimColor>(empty)</Text></Box>}

      {entries.map((e, i) => (
        <Box key={i}>
          <Box width={6}><Text dimColor>{e.offset.toString(16).padStart(4, '0')}</Text></Box>
          <Box width={50}><Text>{e.hexBytes.length > 50 ? e.hexBytes.slice(0, 47) + '...' : e.hexBytes}</Text></Box>
          <Box width={10}><Text backgroundColor={TAG_BG[e.tagName === 'Object' || e.tagName === 'Array' ? 'magenta' : e.tagName.toLowerCase()] ?? '#333'} color={TAG_COLORS[e.tagName === 'Object' || e.tagName === 'Array' ? 'magenta' : e.tagName.toLowerCase()] ?? 'white'}> {e.tagName} </Text></Box>
          <Box><Text>  {e.decoded.length > 40 ? e.decoded.slice(0, 37) + '...' : e.decoded}</Text><Text dimColor>  ({e.byteCount}B)</Text></Box>
        </Box>
      ))}

      <Box marginTop={1}><Text dimColor>{'─'.repeat(cols)}</Text></Box>

      <Box>
        <Text dimColor>Legend: </Text>
        <Text color="#00FFFF">■Number </Text>
        <Text color="#00FF7F">■String </Text>
        <Text color="#FFD700">■Boolean </Text>
        <Text color="#FF69B4">■Obj/Arr </Text>
        <Text color="#888888">■Null</Text>
      </Box>

      <Box marginTop={1} flexWrap="wrap">
        <Text bold>Keys: </Text>
        <Text backgroundColor="#333" color="white"> n </Text><Text> num  </Text>
        <Text backgroundColor="#333" color="white"> s </Text><Text> str  </Text>
        <Text backgroundColor="#333" color="white"> b </Text><Text> bool  </Text>
        <Text backgroundColor="#333" color="white"> o </Text><Text> obj  </Text>
        <Text backgroundColor="#333" color="white"> a </Text><Text> arr  </Text>
        <Text backgroundColor="#333" color="white"> l </Text><Text> null  </Text>
        <Text backgroundColor="#333" color="white"> r </Text><Text> reset  </Text>
        <Text backgroundColor="#333" color="white"> c </Text><Text> clear  </Text>
        <Text backgroundColor="#FF4444" color="white"> q </Text><Text> quit  </Text>
      </Box>
    </Box>
  );
}

render(<HexViewer />, { exitOnCtrlC: true });
