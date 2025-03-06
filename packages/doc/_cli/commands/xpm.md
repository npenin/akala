# XPM Command

## Overview

The XPM command provides functionality to manage packages using different package managers.

## Function

### xpm

```javascript
export default function xpm(config, program)
```

Manages packages using different package managers.

**Parameters:**

- `config`: The configuration object.
- `program`: The program object.

**Commands:**

- `add <package>`: Adds a package.
- `remove <package>`: Removes a package.

## Example Usage

```javascript
import xpm from './xpm';

const config = { /* configuration object */ };
const program = { /* program object */ };
xpm(config, program);
```
