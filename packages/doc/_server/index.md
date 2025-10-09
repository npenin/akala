---
title: Server Module
---
# Server Module

## Overview

`@akala/server` is a flexible, middleware-based HTTP server framework built on Node.js that integrates deeply with the Akala command/container architecture. It provides Express-style routing with full async/await support and enables building modular web applications and APIs.

**Key capabilities:**
- HTTP/1.1, HTTP/2, HTTPS, and WebSocket support
- Express-style middleware and routing
- Static file serving
- Cookie and body parsing
- Content negotiation and formatting
- Command container integration
- Remote container proxying

## Installation

```bash
npm install @akala/server
```

## Quick Start

```javascript
import { serve } from '@akala/server';

const controller = new AbortController();

const router = await serve({
    urls: [new URL('http://localhost:3000')],
    staticFolders: ['./public'],
    signal: controller.signal
});

router.get('/api/hello', async (req, res) => {
    res.json({ message: 'Hello World' });
});

// Graceful shutdown
process.on('SIGTERM', () => controller.abort());
```

## Core API

### serve(options)

Creates and starts HTTP servers on specified URLs.

```javascript
import { serve } from '@akala/server';

const router = await serve({
    urls: [
        new URL('http://localhost:3000'),
        new URL('https://localhost:8443')
    ],
    staticFolders: ['./public', './dist'],
    signal: abortController.signal,
    fallthrough: true
});
```

**Options:**
- `urls: URL[]` - Server URLs (supports http://, https://, http2://, http2s://)
- `staticFolders?: string[]` - Directories for static file serving
- `signal: AbortSignal` - For graceful shutdown
- `fallthrough?: boolean` - Continue to next middleware if file not found

### HttpRouter

The main routing class providing Express-style API.

```javascript
import { HttpRouter } from '@akala/server';

const router = new HttpRouter({ name: 'api' });

// HTTP method handlers
router.get('/users', async (req, res) => {
    res.json(await getUsers());
});

router.post('/users', async (req, res) => {
    const user = await req.body.json();
    res.status(201).json(await createUser(user));
});

router.put('/users/:id', async (req, res) => {
    const user = await req.body.json();
    res.json(await updateUser(req.params.id, user));
});

router.delete('/users/:id', async (req, res) => {
    await deleteUser(req.params.id);
    res.sendStatus(204);
});
```

**Supported HTTP methods:**
`get`, `post`, `put`, `delete`, `patch`, `options`, `head`, `connect`, `trace`, and more

**Key methods:**
- `use(path?, ...handlers)` - Add middleware
- `upgrade(path, protocol, handler)` - WebSocket upgrades
- `attachTo(server)` - Attach to Node.js server

### Request Interface

Extended from Node.js `IncomingMessage`:

```javascript
router.post('/api/data', async (req, res) => {
    // Route parameters
    const id = req.params.id;

    // Query parameters
    const filter = req.query.get('filter');

    // Parsed URL
    const url = req.uri;

    // Client IP
    const ip = req.ip;

    // Parse JSON body
    const data = await req.body.json();

    // Parse form data
    const form = await req.body.form();

    // Parse text
    const text = await req.body.text();

    // Cookies (with CookieMiddleware)
    const sessionId = req.cookies?.sessionId;

    // Content negotiation
    if (req.accepts.type('json')) {
        res.json({ success: true });
    }
});
```

### Response Interface

Extended from Node.js `ServerResponse`:

```javascript
router.get('/api/user/:id', async (req, res) => {
    const user = await findUser(req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'Not found' });
    }

    // Set cookie
    res.setCookie('lastVisited', new Date().toISOString(), {
        httpOnly: true,
        maxAge: 3600,
        secure: true
    });

    res.json(user);
});

// Redirects
router.get('/old-path', (req, res) => {
    res.redirect('/new-path', 301);
});

// Status codes
router.get('/health', (req, res) => {
    res.sendStatus(200);
});
```

## Middleware

### Static File Serving

```javascript
import { StaticFileMiddleware } from '@akala/server';

router.useMiddleware(
    new StaticFileMiddleware('./public', {
        fallthrough: true,
        maxAge: 3600,
        redirect: true
    })
);

// Multiple static directories
router.useMiddleware(
    new StaticFileMiddleware('./dist', { fallthrough: true })
);
router.useMiddleware(
    new StaticFileMiddleware('./assets')
);
```

**Options:**
- `fallthrough: boolean` - Continue if file not found
- `maxAge: string | number` - Cache control
- `redirect: boolean` - Redirect directories with trailing slash
- `fs: FileSystemProvider` - Custom filesystem

### Cookie Middleware

```javascript
import { CookieMiddleware } from '@akala/server';

router.useMiddleware(
    new CookieMiddleware({ decode: decodeURIComponent })
);

router.get('/api/profile', async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    // Use cookies...
});

router.post('/login', async (req, res) => {
    const session = await createSession();
    res.setCookie('sessionId', session.id, {
        httpOnly: true,
        secure: true,
        maxAge: 86400
    });
    res.json({ success: true });
});
```

### Custom Middleware

```javascript
// Logging middleware
router.use(async (req, res) => {
    console.log(`${req.method} ${req.path}`);
    throw NotHandled; // Continue to next
});

// Authentication middleware
const authMiddleware = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        throw new ErrorWithStatus(401, 'Unauthorized');
    }
    req.user = await verifyToken(token);
    throw NotHandled;
};

// Apply to specific routes
router.get('/protected', authMiddleware, async (req, res) => {
    res.json({ user: req.user });
});

// Apply to all routes under a path
const apiRouter = new HttpRouter();
apiRouter.use(authMiddleware);
router.useMiddleware('/api', apiRouter);
```

## WebSocket Support

```javascript
// WebSocket upgrade handler
router.upgrade('/ws', 'websocket', async (req, socket, head) => {
    const ws = new WebSocket(socket);

    ws.on('message', (data) => {
        console.log('Received:', data);
        ws.send('Echo: ' + data);
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
});
```

## Command Container Integration

Integrate with [@akala/commands](../commands/) for command-based routing:

```javascript
import { Container } from '@akala/commands';
import { trigger, HttpRouter } from '@akala/server';

const api = new Container('api');
const router = new HttpRouter();

// Register commands with HTTP config
api.register({
    name: 'listUsers',
    config: {
        http: {
            method: 'get',
            route: '/users',
            type: 'json'
        }
    }
}, async () => {
    return await db.users.find();
});

api.register({
    name: 'createUser',
    config: {
        http: {
            method: 'post',
            route: '/users',
            type: 'json'
        }
    }
}, async (req) => {
    const body = await req.body.json();
    return await db.users.create(body);
});

// Attach trigger to auto-register routes
api.attach(trigger, router);

const server = http.createServer();
router.attachTo(server);
server.listen(3000);
```

## Multi-Router Architecture

```javascript
import { HttpRouter, StaticFileMiddleware } from '@akala/server';

const mainRouter = new HttpRouter({ name: 'main' });
const apiRouter = new HttpRouter({ name: 'api' });
const adminRouter = new HttpRouter({ name: 'admin' });

// Static files on main router
mainRouter.useMiddleware(
    new StaticFileMiddleware('./public', { fallthrough: true })
);

// API routes
apiRouter.get('/users', listUsers);
apiRouter.post('/users', createUser);

// Admin routes with auth
adminRouter.use(authMiddleware);
adminRouter.get('/dashboard', adminDashboard);

// Mount routers
mainRouter.useMiddleware('/api', apiRouter);
mainRouter.useMiddleware('/admin', adminRouter);

const server = http.createServer();
mainRouter.attachTo(server);
server.listen(3000);
```

## Error Handling

```javascript
import { ErrorWithStatus } from '@akala/core';

// Register error formatter
router.registerErrorFormatter(100);

router.get('/api/users/:id', async (req, res) => {
    const user = await findUser(req.params.id);

    if (!user) {
        throw new ErrorWithStatus(404, 'User not found');
    }

    return user;
});

// Responds with: { statusCode: 404, message: 'User not found' }
```

## Response Formatting

```javascript
import { MimeMiddleware } from '@akala/server';

// JSON formatter (built-in)
router.registerJsonFormatter(100);

// Custom XML formatter
router.formatters.useMiddleware(
    90,
    new MimeMiddleware(
        ['application/xml', 'text/xml'],
        (data) => xmlStringify(data),
        { showErrorDetails: 'local' }
    )
);

// Automatic content negotiation based on Accept header
router.get('/api/data', async (req, res) => {
    return { data: 'value' }; // Formatted as JSON or XML
});
```

## HTTPS and HTTP/2

```javascript
import { serve } from '@akala/server';
import fs from 'fs';

const router = await serve({
    urls: [
        new URL('https://localhost:8443'),
        new URL('http2s://localhost:8444')
    ],
    signal: controller.signal,
    // TLS options passed to server creation
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
});
```

## Remote Container Proxying

Mount remote command containers as HTTP endpoints:

```javascript
import { connect } from '@akala/server';

// Connect to server container
const { container } = await connect(
    { http: new URL('http://localhost:3000') },
    { metadata: serverMeta, container: null },
    'http'
);

// Mount remote container
await container.dispatch(
    'remote-container',
    remoteContainer,
    '/api/external'
);

// Requests to /api/external/* are proxied to remoteContainer
```

## Server Modes

```javascript
// Set server mode
await serverContainer.dispatch('mode', 'production');
// or 'development'

// Different behavior based on mode:
// - Error details in responses
// - Logging verbosity
// - Cache settings
```

## Advanced Features

### Custom Filesystem for Static Files

```javascript
import fsHandler from '@akala/fs';

const customFs = await fsHandler.process(new URL('custom://assets'));

router.useMiddleware(
    new StaticFileMiddleware(null, {
        fs: Promise.resolve(customFs)
    })
);
```

### Body Parsing Options

```javascript
router.post('/upload', async (req, res) => {
    // With size limit
    const data = await req.body.json({ limit: '10mb' });

    // Form data with encoding
    const form = await req.body.form({ encoding: 'utf-8' });

    // Plain text
    const text = await req.body.text();

    // Raw parsing
    const raw = await req.body.parse({ returnRawBody: true });
});
```

### Request Context and Dependency Injection

```javascript
import { Injector } from '@akala/core';

const injector = new Injector();
injector.register('db', database);

router.use(async (req, res) => {
    req.injector = injector;
    throw NotHandled;
});

router.get('/users', async (req, res) => {
    const db = await req.injector.resolve('db');
    res.json(await db.users.find());
});
```

## Related Modules

- [@akala/commands](../commands/) - Command container system
- [@akala/core](../core/) - Core utilities and middleware
- [@akala/fs](../fs/) - File system abstraction
- [@akala/json-rpc-ws](../jsonrpc/) - JSON-RPC over WebSocket

## Contributing

Contributions are welcome! Please follow the guidelines in the main repository.

## License

This module is licensed under the BSD-3-Clause License.
