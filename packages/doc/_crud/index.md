---
title: CRUD Module
---
# CRUD Module

## Overview
The `crud` module provides utilities for implementing Create, Read, Update, and Delete (CRUD) operations within the Akala framework. It simplifies the management of data entities and their lifecycle.

## Installation
To install the `crud` module, use the following command:

```bash
npm install @akala/crud
```

## Usage
Import the module and use its features as follows:

```javascript
import * as crud from '@akala/crud';

// Example usage
const userCrud = crud.create('User');
await userCrud.create({ name: 'John Doe', email: 'john.doe@example.com' });
```

## API Reference

| Method | Description |
| --- | --- |
| `create(entityName: string): CrudService` | Creates a new CRUD service for the specified entity. |
| `CrudService.create(data: any): Promise<any>` | Creates a new entity with the provided data. |
| `CrudService.read(id: string): Promise<any>` | Reads an entity by its ID. |
| `CrudService.update(id: string, data: any): Promise<any>` | Updates an entity with the specified ID and data. |
| `CrudService.delete(id: string): Promise<void>` | Deletes an entity by its ID. |

## Examples

### Basic CRUD Operations
```javascript
import * as crud from '@akala/crud';

// Create a CRUD service for users
const userCrud = crud.create('User');

// Create a new user
await userCrud.create({ name: 'John Doe', email: 'john.doe@example.com' });
console.log('User created');

// Read a user by ID
const user = await userCrud.read('userId');
console.log('User details:', user);

// Update a user
const updatedUser = await userCrud.update('userId', { email: 'new.email@example.com' });
console.log('User updated:', updatedUser);

// Delete a user
await userCrud.delete('userId');
console.log('User deleted');
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.