# Getting Started with Akala

Welcome to Akala! This guide will help you get started with our new framework.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14.x or later)
- npm (version 6.x or later) or Yarn (version 1.x or later)

## Installation

To install Akala, run one of the following commands:

Using npm:

```bash
npm install @akala/cli
```

Using Yarn:

```bash
yarn add @akala/cli
```

## Creating a New Project

To create a new Akala project, use one of the following commands:

Using npm:

```bash
npx akala create my-new-project
```

Using Yarn:

```bash
yarn create akala my-new-project
```

Replace `my-new-project` with your desired project name.

## Running the Project

Navigate to your project directory and start the development server:

```bash
cd my-new-project
akala start
```

Your project should now be running at `http://localhost:3000`.

## Project Structure

Here's a brief overview of the project structure:

```
my-new-project/
├── src/
│   ├── components/
│   ├── pages/
│   └── index.js
├── public/
│   └── index.html
└── package.json
```

- `src/`: Contains your source code.
- `public/`: Contains static assets.
- `package.json`: Manages project dependencies.

## Learn More

To learn more about Akala, visit our [documentation](https://akala.js.org/client).

Happy coding!
