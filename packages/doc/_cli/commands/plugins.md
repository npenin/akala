# Plugins Command

## Overview

The Plugins command provides functionality to manage plugins.

## Function

### plugins

```javascript
export default function (config, program)
```

Manages plugins.

**Parameters:**

- `config`: The configuration object.
- `program`: The program object.

**Commands:**

- `add <path>`: Adds a plugin.
- `remove <path>`: Removes a plugin.
- `ls`: Lists all plugins.

## Example Usage

```javascript
import plugins from './plugins';

const config = { /* configuration object */ };
const program = { /* program object */ };
plugins(config, program);
```
