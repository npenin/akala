---
title: Authentication Module
---
# Authentication Module

## Overview
The `authentication` module provides tools and utilities for managing user authentication within the Akala framework. It supports various authentication mechanisms, including OpenID Connect (OIDC), session management, and middleware utilities. The module integrates seamlessly with other Akala modules.

## Installation
To install the `authentication` module, use the following command:

```bash
npm install @akala/authentication
```

## Usage

### Using federated authentication

#### Azure
```typescript
import { serve } from '@akala/server'

import * as auth from '@akala/authentication/server'
import { ErrorWithStatus, HttpStatusCode } from '@akala/core';

const abort = new AbortController();

const router = await serve({
    // staticFolders: ['wwwroot'],
    urls: ['http://localhost:8080'],
    signal: abort.signal,
})

router.registerErrorFormatter();

const azure = await auth.OidcFormatter.Azure({
    tenantId: '<your-tenant-id>',
    clientId: '<your-client-id>',
    redirectUri: '/oauth/azure',
    clientSecret: '<your-client-secret>',
    scope: ['openid', 'profile', 'user.read'].join(' '),
});

azure.attachTo(router, 10, keys => new auth.CookieAuthenticateMiddleware('session', new auth.StringSerializer(), { path: '/', HttpOnly: true, SameSite: 'Strict' }))

router.get('/', azure.authenticated, async (req: auth.AuthRequest<unknown>, res) =>
{
    return req.user
});
```

With these few lines of code, you created:
- a web server listening on localhost:8080
- an authentication delegated to Micrsofot Azure
- a route that 
    - receives the authenticate code (`/oauth/azure`)
    - store the access token in the `session` cookie
    - redirects to the home route
- a default route that displays the access token 

#### Google
```typescript
import { serve } from '@akala/server'

import * as auth from '@akala/authentication/server'
import { ErrorWithStatus, HttpStatusCode } from '@akala/core';

const abort = new AbortController();

const router = await serve({
    // staticFolders: ['wwwroot'],
    urls: ['http://localhost:8080'],
    signal: abort.signal,
})

router.registerErrorFormatter();

const google = await auth.OidcFormatter.Google({
    clientId: '<your-client-id>',
    redirectUri: '/oauth/google',
    clientSecret: '<your-client-secret>',
    scope: ['openid', 'profile', 'email'].join(' '),
});

google.attachTo(router, 10, keys => new auth.CookieAuthenticateMiddleware('session', new auth.StringSerializer(), { path: '/', HttpOnly: true, SameSite: 'Strict' }))

router.get('/', google.authenticated, async (req: auth.AuthRequest<unknown>, res) =>
{
    return req.user
});
```

With these few lines of code, you created:
- a web server listening on localhost:8080
- an authentication delegated to Micrsofot Azure
- a route that 
    - receives the authenticate code (`/oauth/google`)
    - store the access token in the `session` cookie
    - redirects to the home route
- a default route that displays the access token 

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.
