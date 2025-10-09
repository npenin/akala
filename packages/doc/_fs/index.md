---
title: FS Module
---
# FS Module

## Overview
The `@akala/fs` module provides a unified, protocol-based file system abstraction layer that works across different environments (Node.js and browser). It supports multiple protocols including `file://` for local file system access and `npm://` for accessing files within npm packages.

The module defines a comprehensive `FileSystemProvider` interface that abstracts file system operations, making it easy to work with files in a consistent way regardless of the underlying implementation.

## Installation
To install the `fs` module, use the following command:

```bash
npm install @akala/fs
```

## Key Features

- **Protocol-based file system handlers** - Access files using URLs with different protocols
- **npm:// protocol** - Direct access to files within installed npm packages
- **file:// protocol** - Standard file system access
- **FileSystemProvider interface** - Unified API for file operations
- **Browser and Node.js support** - Works in both environments with appropriate implementations
- **FileHandle API** - File handle abstraction with disposable pattern support
- **Readonly file system providers** - Read-only views of file systems
- **Streaming support** - ReadableStream and WritableStream for efficient I/O
- **Glob pattern matching** - Find files using glob patterns

## Core Components

### FileSystemProvider Interface

The main abstraction for file system operations. Provides methods for:

- Reading/writing files
- Creating/deleting directories
- Listing directory contents
- File stats and metadata
- Streaming I/O
- Symbolic links
- File watching
- Glob pattern matching

### FSFileSystemProvider (Node.js)

The Node.js implementation of the FileSystemProvider interface, providing access to the local file system.

### FileHandle Interface

Represents an open file with methods for:
- `readFile(encoding)` - Read file contents (supports 'json', 'binary', or text encodings)
- `writeFile(data, encoding)` - Write file contents
- `openReadStream(options)` - Open a readable stream
- `openWriteStream(options)` - Open a writable stream
- `stat(opts)` - Get file statistics
- `close()` - Close the file handle
- Disposable pattern support (`Symbol.dispose`, `Symbol.asyncDispose`)

### OpenFlags Enum

Flags for file operations:
- `Read` - Open for reading
- `Write` - Open for writing
- `ReadWrite` - Open for reading and writing
- `Append` - Open for appending
- `CreateIfNotExist` - Create file if it doesn't exist
- `Truncate` - Truncate file
- `NonExisting` - Ensure file doesn't exist

## Usage

### Basic File Operations

```javascript
import { openFile, readFile, writeFile, OpenFlags } from '@akala/fs';

// Read a file
const content = await readFile('path/to/file.txt', 'utf-8');

// Read JSON file
const data = await readFile('config.json', 'json');

// Write a file
await writeFile('output.txt', 'Hello World', 'utf-8');

// Write JSON
await writeFile('data.json', { foo: 'bar' }, 'json');

// Open a file handle
const handle = await openFile('file.txt', OpenFlags.Read);
const content = await handle.readFile('utf-8');
await handle.close();

// Or use disposable pattern
using handle = await openFile('file.txt', OpenFlags.Read);
const content = await handle.readFile('utf-8');
// Automatically closed at end of scope
```

### Protocol Handlers

```javascript
import fsHandler from '@akala/fs';

// Access local file system
const fs = await fsHandler.process(new URL('file:///home/user/documents'));
const files = await fs.readdir('./');

// Access npm package files
const npmFs = await fsHandler.process(new URL('npm:///@akala/core'));
const pkgJson = await npmFs.readFile('./package.json', 'json');
```

### npm:// Protocol

The npm protocol allows you to access files within installed npm packages:

```javascript
import fsHandler from '@akala/fs';

// Access a package's root directory
const fs = await fsHandler.process(new URL('npm:///@akala/commands'));

// Read package.json from the package
const pkg = await fs.readFile('./package.json', 'json');

// Access specific files within the package
const specificFs = await fsHandler.process(new URL('npm:///@akala/commands/src/index.js'));
```

### Working with FileSystemProvider

```javascript
import fsHandler from '@akala/fs';

const fs = await fsHandler.process(new URL('file:///project'));

// Read directory
const files = await fs.readdir('./', { withFileTypes: true });
for (const file of files) {
    console.log(file.name, file.isFile(), file.isDirectory());
}

// File stats
const stats = await fs.stat('./file.txt');
console.log(stats.size, stats.mtime);

// Create directory
await fs.mkdir('./newdir', { recursive: true });

// Copy file
await fs.copyFile('./source.txt', './dest.txt');

// Remove file
await fs.unlink('./file.txt');

// Remove directory
await fs.rmdir('./dir', { recursive: true });
```

### Streaming Operations

```javascript
import { openFile, OpenFlags } from '@akala/fs';

// Read stream
const file = await openFile('large-file.txt', OpenFlags.Read);
const stream = file.openReadStream({ encoding: 'utf-8' });
const reader = stream.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value);
}

await file.close();

// Write stream
const outFile = await openFile('output.txt', OpenFlags.Write | OpenFlags.CreateIfNotExist);
const writeStream = outFile.openWriteStream();
const writer = writeStream.getWriter();
await writer.write('Hello World');
await writer.close();
await outFile.close();
```

### Glob Pattern Matching

```javascript
import fsHandler from '@akala/fs';

const fs = await fsHandler.process(new URL('file:///project'));

// Find all TypeScript files
for await (const file of fs.glob('**/*.ts')) {
    console.log(file.toString());
}

// With file types
for await (const entry of fs.glob('**/*.ts', { withFileTypes: true })) {
    console.log(entry.name, entry.isFile());
}
```

### Read-Only File System

```javascript
import { ReadonlyFileSystemProvider } from '@akala/fs';

// Create a read-only file system provider
// Useful for preventing accidental modifications
// Extend ReadonlyFileSystemProvider and implement read methods
```

### Custom Protocol Registration

```javascript
import fsHandler from '@akala/fs';

// Register a custom protocol handler
fsHandler.useProtocol('custom', async (url) => {
    // Return a FileSystemProvider instance
    return new MyCustomFileSystemProvider(url);
});

// Use the custom protocol
const fs = await fsHandler.process(new URL('custom://path'));
```

## API Reference

### Top-level Functions

- `openFile(filePath, flags)` - Open a file and return a FileHandle
- `readFile(filePath, encoding, flags?)` - Read entire file contents
- `writeFile(filePath, data, encoding?, flags?)` - Write data to a file
- `fsHandler.process(url)` - Get a FileSystemProvider for the given URL
- `fsHandler.useProtocol(protocol, handler)` - Register a custom protocol handler

### Types and Interfaces

- `FileSystemProvider<TFileHandle>` - Main file system interface
- `FileHandle` - File handle interface
- `OpenFlags` - File opening flags enum
- `Stats` - File statistics interface
- `FileEntry` - Directory entry interface
- `PathLike` - Union type for paths (string | URL | FileHandle)

## Environment Differences

### Node.js
- Full file system access via `FSFileSystemProvider`
- npm:// protocol support
- Complete read/write operations

### Browser
- Limited file system access
- Custom implementations required
- Protocol handlers can be registered for virtual file systems

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the BSD-3-Clause License.
