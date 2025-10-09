---
title: Gateway Module
---
# Gateway Module

## Overview
The `@akala/gateway` module provides a CLI wrapper processor that allows you to integrate external command-line tools into the Akala command system. It acts as a bridge between Akala commands and external CLI binaries by spawning child processes and handling their input/output.

This is useful when you want to expose existing CLI tools through Akala's command container system while maintaining proper input/output handling and error reporting.

## Installation
To install the `gateway` module, use the following command:

```bash
npm install @akala/gateway
```

## Key Components

### CliGatewayProcessor

The main class that wraps CLI command execution. It extends `CommandProcessor` from `@akala/commands` and handles spawning external processes.

**Constructor:**
- `bin: string` - The path or name of the CLI binary to execute

**Methods:**
- `handle(origin, cmd, param)` - Processes commands by spawning the CLI binary with parsed arguments

### $init Command

Initializes a container with the CLI gateway processor.

**Parameters:**
- `container: Container<void>` - The command container to initialize
- `bin: string` - (Optional) The CLI binary path. Defaults to the container name if not provided

## Usage

### Basic Setup

```javascript
import { Container } from '@akala/commands';
import $init from '@akala/gateway/commands/$init.js';

// Create a container for your CLI tool
const container = new Container('my-cli-tool');

// Initialize with default binary name (uses container name)
await $init(container);

// Or specify a custom binary
await $init(container, '/path/to/my-binary');
```

### How It Works

1. The `CliGatewayProcessor` is registered as middleware in the command container
2. When a command is executed, it converts Akala command parameters to CLI arguments
3. The external binary is spawned as a child process with proper I/O handling
4. stdout/stderr are captured and returned to the caller
5. Exit codes are handled - non-zero codes result in errors

### Example: Wrapping Git Commands

```javascript
import { Container } from '@akala/commands';
import $init from '@akala/gateway/commands/$init.js';

// Create a container for git commands
const gitContainer = new Container('git');

// Initialize with git binary
await $init(gitContainer, 'git');

// Now commands executed on this container will spawn git processes
// with appropriate argument parsing
```

## Architecture

The gateway processor:
- Uses `@akala/cli` for argument parsing/unparsing
- Spawns child processes with `child_process.spawn`
- Inherits stdin and pipes stdout/stderr for capture
- Returns promises that resolve/reject based on exit codes
- Integrates seamlessly with the `@akala/commands` middleware pipeline

## Use Cases

- **Wrapping existing CLI tools** into Akala command containers
- **Standardizing access** to system utilities through Akala's command system
- **Managing external processes** with proper error handling
- **Building gateways** to external command-line applications

## Related Modules

- [@akala/commands](../commands/) - Command container system
- [@akala/cli](../cli/) - CLI argument parsing
- [@akala/core](../core/) - Core utilities (MiddlewarePromise, Deferred)

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the BSD-3-Clause License.