# Log Command

## Overview

The Log command provides functionality to get the logs of a process.

## Function

### log

```javascript
export default function log(name)
```

Gets the logs of a process.

**Parameters:**

- `name`: The name of the process.

**Returns:**

- `PassThrough`: A PassThrough stream of the logs.

## Example Usage

```javascript
import log from './log';

const logStream = log('my-process');
logStream.pipe(process.stdout);
```
