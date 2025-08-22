---
title: Sidecar Module
---
# Sidecar Module

## Overview
The `sidecar` module provides utilities for managing sidecar processes within the Akala framework. It enables seamless integration and communication between primary applications and their sidecar components.

## Installation
To install the `sidecar` module, use the following command:

```bash
npm install @akala/sidecar
```

## Usage
Import the module and use its features as follows:

```javascript
import * as sidecar from '@akala/sidecar';

// Example usage
sidecar.start('mySidecar');
```

## API Reference

| Method | Description |
| --- | --- |
| `start(name: string): void` | Starts the specified sidecar process. |
| `stop(name: string): void` | Stops the specified sidecar process. |
| `status(name: string): string` | Returns the status of the specified sidecar process. |

## Examples

### Start a Sidecar Process
```javascript
import * as sidecar from '@akala/sidecar';

sidecar.start('mySidecar');
console.log('Sidecar process started');
```

### Stop a Sidecar Process
```javascript
import * as sidecar from '@akala/sidecar';

sidecar.stop('mySidecar');
console.log('Sidecar process stopped');
```

### Check Sidecar Status
```javascript
import * as sidecar from '@akala/sidecar';

const status = sidecar.status('mySidecar');
console.log('Sidecar status:', status);
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.