# Binary Storage System

## Why

JSON files are simple but inefficient for sequential data (logs, events, telemetry). The binary storage system writes typed values in a compact binary format — 1-byte type tag + payload — supporting FIFO read/write with independent cursors. The streaming reader processes large files without loading everything into memory.

## API Index

| API | Purpose |
|-----|---------|
| [createBinaryStorage](./createBinaryStorage-API.md) | Create a binary FIFO store |
| [createStreamingReader](./createStreamingReader-API.md) | Stream values from a binary file |
