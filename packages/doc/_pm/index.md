---
title: Process Manager
---
# Process Manager (@akala/pm)

## Overview

`@akala/pm` is a sophisticated process manager for Node.js applications built on the Akala framework. Similar to PM2, it manages processes, workers, and containers with deep integration into Akala's command system, enabling remote command execution, dependency management, and flexible IPC communication.

**Key Features:**
- Process, worker thread, and Docker container management
- Dependency-based startup ordering
- Remote command execution via JSON-RPC
- Multiple connection transports (Unix sockets, TCP, WebSocket, HTTP)
- Service discovery from npm packages
- Transparent command proxying between containers
- Configuration persistence and hot-reloading

## Installation

```bash
npm install -g @akala/pm
```

## Quick Start

```bash
# Start the PM daemon
pm start pm

# Discover containers in your project
pm discover .

# Install and register a package
pm install @akala/my-service

# Start a container
pm start my-app

# Check status
pm status

# View logs
pm log my-app

# Stop container
pm stop my-app
```

## Core Concepts

### Sidecars

A **sidecar** is a managed container (process, worker, or Docker container) with a unique name. The PM daemon acts as a central manager for all sidecars.

### Containers vs Mapping

- **Container Definition** - Template defining what to run (path, type, dependencies)
- **Container Instance (Mapping)** - Configuration for how to run it (CLI args, working directory, autostart)

### Commandable Containers

Containers that expose [@akala/commands](../commands/) can be called remotely through the PM daemon via JSON-RPC.

### Runtime Types

- **`nodejs`** - Child processes (default)
- **`worker`** - Worker threads for in-process concurrency
- **`docker`** - Docker containers

## CLI Commands

### Process Management

#### start

Start the PM daemon or a container.

```bash
# Start PM daemon
pm start pm

# Start with debugging
pm start pm --inspect --keep-attached

# Options:
#   --inspect         Enable Node.js debugger
#   --inspect-brk     Enable debugger and break on start
#   --keep-attached   Keep terminal attached (don't detach)
#   --wait            Wait for process to be ready
```

#### run

Run a program directly without starting the daemon.

```bash
pm run my-app --arg1 value1

# Options:
#   --name <name>     Container name
#   --new             Force new instance
#   --inspect         Enable debugger
```

#### stop

Stop a container or all containers.

```bash
# Stop specific container
pm stop my-app

# Stop all containers
pm stop
```

#### restart

Restart a container.

```bash
pm restart my-app
```

#### status

View status of containers.

```bash
# All containers
pm status

# Specific container
pm status my-app
```

### Container Management

#### discover

Auto-discover containers from a package.

```bash
# Discover in current directory
pm discover .

# Discover in specific path
pm discover /path/to/package

# With custom name
pm discover /path/to/package my-custom-name
```

Discovers from `package.json`:
- `commands` field (for commandable containers)
- `bin` field (for executables)
- `commands.json` file
- `main` field (fallback)

#### map

Manually register a container definition.

```bash
pm map my-app ./dist/commands.json --commandable --runtime nodejs

# Options:
#   -c, --commandable    Container exposes commands
#   -s, --stateless      Container is stateless
#   -r, --runtime <type> Runtime type (nodejs, worker, docker)
```

#### ls

List all registered containers.

```bash
pm ls
```

#### install

Install npm package and discover its containers.

```bash
pm install @akala/my-service
```

#### uninstall

Uninstall a package.

```bash
pm uninstall @akala/my-service
```

#### link

Link a local package for development.

```bash
pm link my-service /path/to/local/service
```

#### update

Update a package.

```bash
pm update @akala/my-service

# Specific version
pm update @akala/my-service 2.0.0
```

### Monitoring

#### log

View logs for a container.

```bash
pm log my-app
```

#### connect

Get connection information for a container.

```bash
pm connect my-app

# Options:
#   --tcp-port <port>  TCP port
#   --port <port>      HTTP port
#   --key <path>       TLS key file
#   --cert <path>      TLS certificate file
```

## Programmatic API

### Connecting to Containers

#### Using Sidecar Proxy (Recommended)

```javascript
import { sidecar } from '@akala/pm';

// Get sidecar proxy (lazy connection)
const sc = sidecar({ preferRemote: true });

// Access a container (connects on first access)
const myApp = await sc['my-app'];

// Execute commands
const result = await myApp.dispatch('doSomething', arg1, arg2);
```

#### Direct Connection

```javascript
import { connect, defaultOrders } from '@akala/pm';
import { connectByPreference } from '@akala/commands';

const { connect: connectPromise, container: metadata } = await connect('my-app');
const serveMetadata = await connectPromise;

const { container, processor } = await connectByPreference(
    serveMetadata,
    { metadata },
    ...defaultOrders
);

await container.dispatch('myCommand', args);
```

### Default Connection Orders

```javascript
import { defaultOrders } from '@akala/pm';

// Connection preference order:
// 1. 'jsonrpc+unix+tls'   - JSON-RPC over Unix socket with TLS
// 2. 'jsonrpc+unix'       - JSON-RPC over Unix socket
// 3. 'jsonrpc+tcp+tls'    - JSON-RPC over TCP with TLS
// 4. 'jsonrpc+tcp'        - JSON-RPC over TCP
// 5. 'wss'                - WebSocket Secure
// 6. 'ws'                 - WebSocket
// 7. 'https'              - HTTPS
// 8. 'http'               - HTTP
```

### Utility Functions

```javascript
import { getRandomName, interact } from '@akala/pm';

// Generate random container name
const name = getRandomName(); // e.g., "brave-stallman"

// User interaction/prompt
interact('Container started successfully', 'my-app');
```

## Creating Managed Containers

### Commandable Container

```typescript
// src/index.ts
import { Container } from '@akala/commands';
import metadata from './commands.json';

export const container = new Container('my-service', null);

// Register commands
container.register({
    name: 'doSomething',
    config: {
        fs: { path: './commands/do-something.js' }
    }
});

export { metadata };
```

```json
// package.json
{
  "name": "@myorg/my-service",
  "main": "dist/index.js",
  "commands": "./dist/commands.json"
}
```

```bash
# Discover and start
pm discover .
pm start my-service
```

### Executable Container

```json
// package.json
{
  "name": "@myorg/cli-tool",
  "bin": {
    "mytool": "./bin/cli.js"
  }
}
```

```bash
pm discover .
pm start mytool arg1 arg2
```

## Configuration

### Configuration File Structure

PM stores configuration in `.pm.config.json`:

```json
{
  "containers": {
    "my-app": {
      "path": "/path/to/commands.json",
      "type": "nodejs",
      "commandable": true,
      "stateless": false,
      "dependencies": ["database", "cache"]
    },
    "database": {
      "path": "/path/to/db/commands.json",
      "type": "nodejs",
      "commandable": true
    }
  },
  "mapping": {
    "my-app-prod": {
      "container": "my-app",
      "autostart": true,
      "cwd": "/var/app",
      "cli": ["--port", "8080"],
      "config": {
        "environment": "production"
      }
    }
  },
  "plugins": [],
  "setup": {
    "packages": ["@akala/my-service"]
  }
}
```

**containers** - Reusable container definitions
**mapping** - Instance configurations with runtime settings

## Dependency Management

Containers can declare dependencies that must start first:

```json
{
  "containers": {
    "web-server": {
      "path": "./server/commands.json",
      "dependencies": ["database", "redis", "auth-service"]
    }
  }
}
```

PM automatically:
1. Validates all dependencies exist
2. Determines correct startup order using topological sort
3. Starts dependencies before the container
4. Waits for each dependency to signal `ready`

## Runtime Types

### Node.js Child Process (Default)

```bash
pm map my-app ./dist/commands.json --runtime nodejs
```

- Runs in separate Node.js process
- Full isolation
- IPC communication channel
- Can be debugged with `--inspect`

### Worker Thread

```bash
pm map my-app ./dist/commands.json --runtime worker
```

- Runs in worker thread
- Shared memory with main process
- MessagePort communication
- Lower overhead than child process

### Docker Container

```bash
pm map my-app ./docker-config.json --runtime docker
```

- Runs in Docker container
- Full OS-level isolation
- Network-based communication

## Bridge & Proxy System

PM provides transparent command proxying between containers:

```javascript
// Container A wants to call Container B
const sc = sidecar();
const containerB = await sc['container-b'];

// PM automatically:
// 1. Creates a bridge if B doesn't expose direct connection
// 2. Proxies commands through PM daemon
// 3. Routes responses back to A

await containerB.dispatch('someCommand', args);
```

This enables:
- Service mesh patterns
- Zero-trust networking (all communication via PM)
- Dynamic service discovery
- Load balancing (future)

## Advanced Features

### Debugging

```bash
# Start with Chrome DevTools debugger
pm start my-app --inspect

# Break on start
pm start my-app --inspect-brk

# Connect to chrome://inspect in Chrome browser
```

### Custom Connection Configuration

```javascript
const { container } = await connect('my-app', {
    http: new URL('http://localhost:8080'),
    ws: new URL('ws://localhost:8080'),
    'jsonrpc+tcp': {
        port: 9000,
        host: 'localhost'
    }
});
```

### Output Prefixing

All container output is prefixed with container name:

```
[my-app] Server listening on port 3000
[database] Connection established
[cache] Ready to accept connections
```

Supports:
- Color coding (when TTY available)
- Virtual scroll prefixing for complex UIs
- Timestamp prefixing

### Autostart Containers

```json
{
  "mapping": {
    "my-critical-service": {
      "container": "my-service",
      "autostart": true
    }
  }
}
```

Containers with `autostart: true` start automatically when PM daemon starts.

### Hot Reload Metadata

```javascript
// From within PM daemon
await container.dispatch('reload-metadata', 'my-app');

// Container's commands are re-discovered and re-registered
```

### Stateless Containers

```json
{
  "containers": {
    "worker": {
      "path": "./worker.js",
      "stateless": true
    }
  }
}
```

Stateless containers:
- Can have multiple instances
- Don't maintain connection state
- Can be load-balanced

## Integration with Other Packages

### With @akala/commands

```javascript
import { Container } from '@akala/commands';
import { trigger } from '@akala/server';
import { sidecar } from '@akala/pm';

// Get remote container
const sc = sidecar();
const remoteContainer = await sc['remote-service'];

// Proxy commands through local container
localContainer.registerMultiple(remoteContainer);
```

### With @akala/server

```javascript
import { serve } from '@akala/server';
import { sidecar } from '@akala/pm';

const router = await serve({ urls: [new URL('http://localhost:3000')] });

// Mount remote container as HTTP routes
const sc = sidecar();
const apiContainer = await sc['api-service'];
apiContainer.attach(trigger, router);
```

### With @akala/automate

```javascript
// Define workflow that starts containers
{
  "workflow": "deploy",
  "steps": [
    {
      "name": "Start database",
      "container": "@akala/pm",
      "command": "start",
      "args": ["database"]
    },
    {
      "name": "Start web server",
      "container": "@akala/pm",
      "command": "start",
      "args": ["web-server"]
    }
  ]
}
```

## Common Patterns

### Microservices Orchestration

```bash
# Define services
pm map auth-service ./services/auth/commands.json --commandable
pm map api-gateway ./services/gateway/commands.json --commandable
pm map user-service ./services/users/commands.json --commandable

# Configure dependencies
# (edit .pm.config.json to add dependencies)

# Start all services
pm start api-gateway  # Automatically starts dependencies
```

### Development Environment

```bash
# Install all project services
pm install @myorg/database
pm install @myorg/cache
pm install @myorg/api

# Start everything
pm start api  # Starts all dependencies

# View aggregated logs
pm log api
pm log database
pm log cache
```

### Plugin System

```json
{
  "plugins": [
    "@akala/server",
    "@akala/automate",
    "@myorg/custom-plugin"
  ]
}
```

Plugins are loaded at PM startup and can extend PM's functionality.

## Troubleshooting

### Container Won't Start

```bash
# Check logs
pm log my-container

# Check status
pm status my-container

# Try running directly
pm run my-container --keep-attached
```

### Connection Issues

```bash
# Get connection info
pm connect my-container

# Check if container is commandable
pm ls  # Look for commandable: true

# Verify JSON-RPC is working
# (check container logs for connection errors)
```

### Dependency Cycles

PM detects circular dependencies at startup. If you see an error:
```
Error: Circular dependency detected: A -> B -> C -> A
```

Review and fix your dependency chain in `.pm.config.json`.

## Related Modules

- [@akala/commands](../commands/) - Command container system
- [@akala/json-rpc-ws](../jsonrpc/) - JSON-RPC protocol support
- [@akala/config](../configuration/) - Configuration management
- [@akala/cli](../cli/) - CLI framework

## Contributing

Contributions are welcome! Please follow the guidelines in the main repository.

## License

This module is licensed under the BSD-3-Clause License.
