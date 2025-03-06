# REPL Command

## Overview

The REPL command provides functionality to start a REPL session.

## Function

### repl

```javascript
export default function (_config, mainprogram)
```

Starts a REPL session.

**Parameters:**

- `_config`: The configuration object.
- `mainprogram`: The main program object.

## Example Usage

```javascript
import repl from './repl';

const config = { /* configuration object */ };
const mainprogram = { /* main program object */ };
repl(config, mainprogram);
```
