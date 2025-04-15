---
title: JWT Module
---
# JWT Module

## Overview
The `jwt` module provides utilities for working with JSON Web Tokens (JWT) within the Akala framework. It supports token creation, verification, and decoding.

## Installation
To install the `jwt` module, use the following command:

```bash
npm install @akala/jwt
```

## Usage
Import the module and use its features as follows:

```javascript
import * as jwt from '@akala/jwt';

// Example usage
const cryptoKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
);
const token = await jwt.sign({ userId: 123 }, cryptoKey);
console.log(token);
```

## API Reference

| Method | Description |
| --- | --- |
| `sign(payload: object, secret: string, options?: SignOptions): string` | Creates a new JWT with the specified payload, secret, and options. |
| `verify(token: string, secret: string): object` | Verifies the specified JWT and returns its decoded payload. |
| `deserialize(token: string): object` | Decodes the specified JWT without verifying its signature. |

## Examples

### Create a Token
```javascript
import * as jwt from '@akala/jwt';

const cryptoKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
);
const token = await jwt.sign({ userId: 123 }, cryptoKey);
console.log('Generated token:', token);
```

### Verify a Token
```javascript
import * as jwt from '@akala/jwt';

try {
    const cryptoKey = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign', 'verify']
    );
    const payload = await jwt.verify('token', cryptoKey);
    console.log('Token payload:', payload);
} catch (error) {
    console.error('Invalid token:', error);
}
```

### Decode a Token
```javascript
import * as jwt from '@akala/jwt';

const payload = jwt.deserialize('token');
console.log('Decoded payload:', payload);
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.
