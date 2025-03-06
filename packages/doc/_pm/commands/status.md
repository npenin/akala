# Status Command

## Overview

The Status command provides functionality to get the status of processes.

## Function

### status

```javascript
export default function status(name)
```

Gets the status of processes.

**Parameters:**

- `name`: The name of the process.

**Returns:**

- `Array`: An array of process statuses.

## Example Usage

```javascript
import status from './status';

const processStatus = status('my-process');
console.log(processStatus);
```
