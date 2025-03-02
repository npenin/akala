# DataContext

The `DataContext` class is a core component of the Akala framework, responsible for managing and propagating data contexts within a DOM tree. It implements the [`Composer`](composer) interface for `IDataContext`, providing a structured way to handle data binding and context management in web applications.

## What is a Data Context?

A data context is a mechanism that allows you to bind data to HTML elements in a structured and efficient way. It provides a scope for data binding, ensuring that data is consistently propagated and managed throughout the DOM. By defining data contexts, you can isolate different parts of your application, making it easier to manage and maintain.

## Overview

The `DataContext` class allows you to define, extend, and apply data contexts to HTML elements or shadow roots. This enables a consistent and efficient way to manage data and its propagation throughout the DOM.

## Attributes

`data-context` defines the data context for an element. This attribute specifies the scope of the data that can be accessed within the element and its children.

## Usage Example

In the example below, the `DataContext` class is used to manage data contexts for various elements, such as buttons, forms, and tables. This ensures that the data is consistently propagated and managed throughout the DOM tree, enabling efficient data binding and context management.

```html
<main data-context="context.currentUser" i18n-prefix="main">
    <h1>Welcome <span data-bind data-bind-inner-text="context.name"></span> !</h1>
    <p id="debug2" data-bind data-bind-inner-text="context#json"></p>
    <span data-bind="{style:{color:context.name!=='aaa1'?'red':'green'}}" >test</span>
</main>
```

The `data-context` attribute is used to define the data context for the main element.

### Nested DataContext Example

When a nested `data-context` attribute is defined, the parent context is no longer available within that nested scope. This allows for isolated data management within different sections of the DOM.

```html
<main data-context="context.currentUser" i18n-prefix="main">
    <h1>Welcome <span data-bind data-bind-inner-text="context.name"></span> !</h1>
    <p id="debug2" data-bind data-bind-inner-text="context#json"></p>
    
    <section data-context="context.currentUser">
        <h2>User Details</h2>
        <p>Name: <span data-bind data-bind-inner-text="context.name"></span></p>
        <p>Email: <span data-bind data-bind-inner-text="context.email"></span></p>
    </section>
</main>
```

In this example, the `main` element has a `data-context` attribute set to `context.currentUser`. Within this `main` element, there is a nested `section` element with its own `data-context` attribute (`context.currentUser`). The nested context ensures that the data within the `section` is managed independently, and the parent context (`context.currentUser`) is not accessible within this nested section.
