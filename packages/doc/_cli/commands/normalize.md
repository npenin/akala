# Normalize Function

## Overview

The Normalize function provides functionality to normalize paths and URLs.

## Function

### normalize

```javascript
export default function normalize(mode, currentWorkingDirectory, value)
```

Normalizes paths and URLs based on the mode.

**Parameters:**

- `mode`: The mode for normalization:
  - `'import'`: Normalizes the value as an import path. It will use `import.meta.resolve` in some cases, and thus might not be appropriate for all nodejs versions.
  - `'require'`: Normalizes the value as a require path (using createRequire).
  - `'requireMeta'`: Normalizes the value as a require path, to retrieve the package.json.
  - `boolean`: If true, normalizes the value as a path based on the `currentWorkingDirectory`. If false, returns the value unchanged.
  - `{ mode: 'path' | 'require' | 'requireMeta' | 'import', relativeTo?: string }`: An object specifying the mode and an optional relative path for normalization. The relative path is resolved with the current directory if not absolute.
- `currentWorkingDirectory`: The current working directory.
- `value`: The value to normalize.

**Returns:**

- `string`: The normalized path.

## Example Usage

```javascript
import normalize from './normalize';

const mode = true;
const cwd = process.cwd();
const value = './some/path';
const normalizedValue = normalize(mode, cwd, value);
console.log(normalizedValue);
```
