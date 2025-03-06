# Name Command

## Overview

The Name command provides functionality to generate a random name.

## Function

### getRandomName

```javascript
export default function getRandomName(retry)
```

Generates a random name.

**Parameters:**

- `retry`: The retry count.

**Returns:**

- `string`: The generated random name.

## Example Usage

```javascript
import getRandomName from './name';

const randomName = getRandomName(3);
console.log(randomName);
```
