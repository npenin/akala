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

This command will create a boilerplate count application with all required dependencies and a default home page. You may just start it using the `vite` command. Please note that this command will leverage the default configuration from `@akala/web-ui` and use its theme as default. You are obviously free to change whatever was generated, this is **your** app !
 
## Creating Your Second Page

The easiest way to create a page is to leverage the CLI

```bash
akala sdk new page <name of your page> [optional path where to create it]
```

Imagine you want to create your about page, then your command line might look like the following :

```bash
akala sdk new page about pages
```

## Learn More

To learn more about Akala and its features, visit our [documentation](https://akala.js.org/).

Happy coding!
