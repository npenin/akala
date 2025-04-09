# Using Vite with Akala

This guide explains how to set up and use Vite in an Akala project, based on the Vite test project.

## Prerequisites

Ensure you have the following installed:
- Node.js (v20 or later)
- npm or yarn

## Setting Up a Vite Project

1. **Install Vite and Dependencies**:
   Add Vite and other required dependencies to your project:
   ```bash
   yarn add vite @akala/client @akala/core @akala/web-ui
   ```

2. **Project Structure**:
   Organize your project files the way **YOU** want ! 

   You may find below an example:
   ```
   src/
     index.ts
     login/
       login.html
     signup/
       signup.ts
     home.ts
   ```

3. **Entry Point**:
   Create an `index.ts` file as the main entry point. Example:
   ```typescript
   /// <reference types="vite/client" />
   import './index.css';
   import { bootstrapModule, OutletService, outletDefinition } from '@akala/client';
   import { Signup } from './signup/signup.js';
   import { Login } from './login/login.js';
   import Home from './home.js';
   import { bootstrap } from '@akala/web-ui';
   import { DesignKit } from './design-kit/index.js';

   bootstrapModule.activate(['services.$outlet'], async (outlet: OutletService) => {
       outlet.use('/signup', 'main', Signup[outletDefinition]);
       outlet.use('/design-kit', 'main', DesignKit[outletDefinition]);
       outlet.use('/login', 'main', Login[outletDefinition]);
       outlet.use('/', 'main', Home);
   });

   bootstrap('app');
   ```

4. **HTML Template**:
   Create an `index.html` file in the root directory:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Akala Vite App</title>
   </head>
   <body>
       <div id="app"></div>
       <script type="module" src="/src/index.ts"></script>
   </body>
   </html>
   ```

## Running the Project

1. **Development Server**:
   Start the Vite development server:
    ```bash
    vite
    ```

2. **Build the Project**:
   Use the provided build script to bundle the project:
   ```bash
   vite build
   ```

## Additional Notes

- The `@akala/client` and `@akala/web-ui` libraries are used to bootstrap modules and manage routes.
- Customize the `index.ts` file to add more routes or components as needed.

For more details, refer to the [Vite documentation](https://vitejs.dev/).
