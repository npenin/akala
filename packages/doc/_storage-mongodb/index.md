# Storage MongoDB Module

## Overview
The `storage-mongodb` module provides a MongoDB-based storage solution for the Akala framework. It simplifies data storage and retrieval operations using MongoDB as the backend.

## Installation
To install the `storage-mongodb` module, use the following command:

```bash
npm install @akala/storage-mongodb
```

## Usage
Import the module and use its features as follows:

```javascript
import * as storageMongoDB from '@akala/storage-mongodb';

// Example usage
const db = storageMongoDB.connect('mongodb://localhost:27017/mydb');
```

## API Reference
### `connect(uri: string): MongoClient`
Connects to the MongoDB instance at the specified URI and returns a MongoClient instance.

### `getCollection(client: MongoClient, name: string): Collection`
Retrieves a collection by name from the connected MongoDB client.

## Examples
### Connect to MongoDB
```javascript
import * as storageMongoDB from '@akala/storage-mongodb';

const db = storageMongoDB.connect('mongodb://localhost:27017/mydb');
console.log('Connected to MongoDB');
```

### Retrieve a Collection
```javascript
import * as storageMongoDB from '@akala/storage-mongodb';

const db = storageMongoDB.connect('mongodb://localhost:27017/mydb');
const users = storageMongoDB.getCollection(db, 'users');
console.log('Retrieved users collection');
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.