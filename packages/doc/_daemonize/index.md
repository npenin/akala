---
title: Daemonize Module
---
# Daemonize Module

## Overview
The `daemonize` module provides a utility to install and manage services as daemons across different platforms. It supports Windows, Linux (SystemD, OpenRC, and SystemV), and dynamically determines the appropriate platform-specific method to install the service.

## Installation
To install the `daemonize` module, use the following command:
```bash
npm install @akala/daemonize
```

## Usage
Import the module and use the `install` function to set up a service:
```javascript
import install from '@akala/daemonize';

const service = {
    name: 'myService',
    binPath: '/path/to/executable',
    args: ['--arg1', '--arg2'],
    platformSpecific: {
        linux: {
            systemd: {
                description: 'My Service',
                after: 'network.target',
                wantedBy: 'multi-user.target'
            }
        }
    }
};

install(service).then(() => {
    console.log('Service installed successfully');
}).catch(err => {
    console.error('Failed to install service:', err);
});
```

## API Reference
### `install(service: Service): Promise<void>`
Installs the specified service as a daemon. The `Service` object must include the following properties:
- `name` (string): The name of the service.
- `binPath` (string): The path to the executable.
- `args` (string[]): Arguments to pass to the executable.
- `platformSpecific` (object): Platform-specific configurations.

#### Platform-Specific Configurations
- **Windows**: Uses PowerShell scripts to create the service.
- **Linux**: Supports SystemD, OpenRC, and SystemV. Automatically detects the init system and applies the appropriate configuration.

## Examples
### Install a Service on Linux
```javascript
import install from '@akala/daemonize';

const service = {
    name: 'myLinuxService',
    binPath: '/usr/bin/my-service',
    args: ['--config', '/etc/my-service/config.json'],
    platformSpecific: {
        linux: {
            systemd: {
                description: 'My Linux Service',
                after: 'network.target',
                wantedBy: 'multi-user.target'
            }
        }
    }
};

install(service).then(() => {
    console.log('Linux service installed successfully');
}).catch(err => {
    console.error('Failed to install Linux service:', err);
});
```

### Install a Service on Windows
```javascript
import install from '@akala/daemonize';

const service = {
    name: 'myWindowsService',
    binPath: 'C:\\path\\to\\executable.exe',
    args: ['/arg1', '/arg2'],
    platformSpecific: {}
};

install(service).then(() => {
    console.log('Windows service installed successfully');
}).catch(err => {
    console.error('Failed to install Windows service:', err);
});
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.
