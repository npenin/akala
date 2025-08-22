# TACL Module

## Overview
The `tacl` module provides a framework for managing access control lists (ACLs) within the Akala ecosystem. It enables fine-grained permission management for resources and users.

## Installation
To install the `tacl` module, use the following command:

```bash
npm install @akala/tacl
```

## Usage
Import the module and use its features as follows:

```javascript
import * as tacl from '@akala/tacl';

// Example usage
tacl.addPermission('resource1', 'user1', 'read');
```

## API Reference
### `addPermission(resource: string, user: string, permission: string): void`
Adds a permission for the specified user on the given resource.

### `removePermission(resource: string, user: string, permission: string): void`
Removes a permission for the specified user on the given resource.

### `checkPermission(resource: string, user: string, permission: string): boolean`
Checks if the specified user has the given permission on the resource.

## Examples
### Add a Permission
```javascript
import * as tacl from '@akala/tacl';

tacl.addPermission('resource1', 'user1', 'read');
console.log('Permission added');
```

### Remove a Permission
```javascript
import * as tacl from '@akala/tacl';

tacl.removePermission('resource1', 'user1', 'read');
console.log('Permission removed');
```

### Check a Permission
```javascript
import * as tacl from '@akala/tacl';

const hasPermission = tacl.checkPermission('resource1', 'user1', 'read');
console.log('Has permission:', hasPermission);
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.