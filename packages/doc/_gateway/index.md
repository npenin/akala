---
title: Gateway Module
---
# Gateway Module

## Overview
The `gateway` module provides a framework for managing API gateways within the Akala ecosystem. It supports routing, middleware, and integration with various backend services.

## Installation
To install the `gateway` module, use the following command:

```bash
npm install @akala/gateway
```

## Usage
Import the module and use its features as follows:

```javascript
import * as gateway from '@akala/gateway';

// Example usage
gateway.create('myGateway', { routes: [] });
```

## API Reference

| Method | Description |
| --- | --- |
| `create(name: string, options: GatewayOptions): Gateway` | Creates a new API gateway with the specified name and options. |
| `addRoute(gateway: Gateway, route: Route): void` | Adds a route to the specified gateway. |
| `removeRoute(gateway: Gateway, routeId: string): void` | Removes a route from the specified gateway by its ID. |

## Examples

### Create a Gateway
```javascript
import * as gateway from '@akala/gateway';

// Create a new gateway
gateway.create('myGateway', { routes: [] });
console.log('Gateway created');
```

### Add a Route
```javascript
import * as gateway from '@akala/gateway';

const myGateway = gateway.create('myGateway', { routes: [] });
const route = { id: 'route1', path: '/api', handler: () => {} };
gateway.addRoute(myGateway, route);
console.log('Route added');
```

### Remove a Route
```javascript
import * as gateway from '@akala/gateway';

const myGateway = gateway.create('myGateway', { routes: [] });
gateway.removeRoute(myGateway, 'route1');
console.log('Route removed');
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.