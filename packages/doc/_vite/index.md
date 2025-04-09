---
title: @akala/vite
---
# @akala/vite Documentation

## Overview

The `@akala/vite` package provides a set of tools and configurations to integrate Akala's ecosystem with Vite, a modern frontend build tool. It includes plugins, configurations, and utilities to streamline development and build processes.

---

## Key Features

- **Vite Plugin Integration**: Includes a custom Vite plugin for Akala.
- **PostCSS Configuration**: Pre-configured PostCSS setup with Akala's web UI utilities.
- **Authentication Support**: Built-in support for authentication commands.
- **Customizable Build Output**: Configurable build output directory and manifest generation.
- **CSS Variables**: Provides a comprehensive set of CSS variables for responsive design and theming.

---

## Installation

To install the `@akala/vite` package, use the following command:

```bash
npm install @akala/vite
```

```bash
yarn add @akala/vite
```

---

## Configuration

### Vite Configuration

The `vite.config.mts` file demonstrates how to configure Vite with the Akala plugin:

```typescript
import { plugin as akala } from '@akala/vite';
import { Processors } from '@akala/commands';

export default {
    build: {
        manifest: true,
        outDir: 'vite-dist',
    },
    esbuild: {
        supported: {
            'top-level-await': true,
        },
    },
    plugins: [
        akala({
            auth: {
                path: 'npm:///@akala/authentication/commands.json',
                init: ['file', null, 'my-very-secret-key'],
            },
        }, [{
            priority: 0,
            processor: new Processors.AuthHandler(async (container, command, params) => {
                console.log(command.name);
                // Authentication logic here
            }),
        }]),
    ],
} as import('vite').UserConfig;
```

### PostCSS Configuration

The `.postcssrc.mjs` file includes Akala's PostCSS plugins for enhanced styling capabilities:

```javascript
import akala from "@akala/web-ui/postcss";
import fullCompose from "@akala/web-ui/postcss-full-compose";
import contrast from "@akala/web-ui/postcss-contrast";
import customMedia from "postcss-custom-media";

export default {
    plugins: [
        akala({ includeDefaultTheme: true, generateOptions: { customMedia: true } }),
        fullCompose(),
        contrast(),
        customMedia(),
    ],
};
```

---

## File Structure

- **`src/`**: Source code for the package.
- **`dist/`**: Compiled output.
- **`test/`**: Test files for the package.
- **`vite.config.mts`**: Vite configuration file.
- **`.postcssrc.mjs`**: PostCSS configuration.
