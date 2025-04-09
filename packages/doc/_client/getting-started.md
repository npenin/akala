---
title: Getting started
---

# Getting Started with Akala Client

Welcome to the Akala Client guide! Before proceeding, make sure you have followed the [Getting Started with Akala](../getting-started) guide.

## Prerequisites

Ensure you have the following installed:

- Node.js (version 20.x or later)
- [Akala](../getting-started) (installed via npm or Yarn)

## Setting Up Your Client Project

To work with akala client, you will first of all need to install it and then register the client plugin.

Akala will automatically detect which package manager you are using to install the package.

```bash
akala install @akala/client
```

Optionally before going further, you may set up your [preferences](preferences).

Once done, you may then create your client application.

```bash
akala sdk new client <your project>
```

## Creating Your First Page

The easiest way to create a page is to leverage the CLI

```bash
akala sdk new page <name of your page> [optional path where to create it]
```

1. Create an `index.html` file:

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Akala Client</title>
    </head>
    <body>
        <script src="index.js"></script>
    </body>
    </html>
    ```

2. Create an `index.js` file:

    ```javascript
    import { Akala } from 'akala';

    const app = new Akala();

    app.start().then(() => {
        console.log('Akala client started');
    });
    ```

3. Run any web server (like [../../vite](vite)) and open `index.html` in your browser to see your Akala client in action.



## Learn More

To learn more about Akala and its features, visit our [documentation](https://akala.js.org/).

Happy coding!
