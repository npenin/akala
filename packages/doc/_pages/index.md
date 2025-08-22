---
title: Pages Module
---
# Pages Module

## Overview
The `pages` module provides a framework for creating and managing web pages within the Akala ecosystem. It supports dynamic routing, templating, and content management.

## Installation
To install the `pages` module, use the following command:

```bash
npm install @akala/pages
```

## Usage
Import the module and use its features as follows:

```javascript
import * as pages from '@akala/pages';

// Example usage
pages.createPage('home', { template: 'home.html', data: {} });
```

## API Reference

| Method | Description |
| --- | --- |
| `createPage(name: string, options: PageOptions): Page` | Creates a new page with the specified name and options. |
| `addRoute(page: Page, route: Route): void` | Adds a route to the specified page. |
| `removeRoute(page: Page, routeId: string): void` | Removes a route from the specified page by its ID. |

## Examples

### Create a Page
```javascript
import * as pages from '@akala/pages';

// Create a new page
pages.createPage('home', { template: 'home.html', data: {} });
console.log('Page created');
```

### Add a Route
```javascript
import * as pages from '@akala/pages';

const homePage = pages.createPage('home', { template: 'home.html', data: {} });
const route = { id: 'route1', path: '/', handler: () => {} };
pages.addRoute(homePage, route);
console.log('Route added');
```

### Remove a Route
```javascript
import * as pages from '@akala/pages';

const homePage = pages.createPage('home', { template: 'home.html', data: {} });
pages.removeRoute(homePage, 'route1');
console.log('Route removed');
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.