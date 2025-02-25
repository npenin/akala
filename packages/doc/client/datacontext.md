# DataContext

The `DataContext` class is a core component of the Akala framework, responsible for managing and propagating data contexts within a DOM tree. It implements the `Composer` interface for `IDataContext`, providing a structured way to handle data binding and context management in web applications.

## What is a Data Context?

A data context is a mechanism that allows you to bind data to HTML elements in a structured and efficient way. It provides a scope for data binding, ensuring that data is consistently propagated and managed throughout the DOM. By defining data contexts, you can isolate different parts of your application, making it easier to manage and maintain.

## Overview

The `DataContext` class allows you to define, extend, and apply data contexts to HTML elements or shadow roots. This enables a consistent and efficient way to manage data and its propagation throughout the DOM.

## Attributes

- `data-context`: Defines the data context for an element. This attribute specifies the scope of the data that can be accessed within the element and its children.
- `data-bind`: Binds data to an element. This attribute can be used to bind various properties, such as `innerText`, `style`, etc. See more in [DataBind](databind).
- `on-click`: Binds a click event to a method in the controller. See more in [Events](event)
- `i18n-prefix`: Specifies the prefix for internationalization keys. See more in [I18n](i18n).

## Usage Example

In the below example, the `DataContext` class is used to manage data contexts for various elements, such as buttons, forms, and tables. This ensures that the data is consistently propagated and managed throughout the DOM tree, enabling efficient data binding and context management.

```html
<main data-context="context.currentUser" i18n-prefix="main">
    <h1>Welcome <span data-bind data-bind-inner-text="context.name"></span> !</h1>
    <p id="debug2" data-bind data-bind-inner-text="context#json"></p>
    <span data-bind="{style:{color:context.name!=='aaa1'?'red':'green'}}" on-click="controller.test2"
        on="{click:controller.test}" i18n i18n-inner-text="context.name"></span>

    <kl-popover trigger="#dd" placement="'bottom-start'" id="kldd" closeOnClickOutside="controller.coco">pwet
        pwet</kl-popover>
    <input id="dd" onfocus="kldd.showPopover()" />

    <button on on-click="controller.toggleCoco.bind(controller)">Toggle coco</button>
    <span id="debug" data-bind="{innerText:controller#json}"></span>
    <span id="debug3" data-bind="{innerText:controller.commands#async#json}"></span>

    <ul is="ul-each" each="controller.commands" item-property-name="command">
        <template>
            <li data-bind data-bind-inner-text="command.name"></li>
        </template>
    </ul>
</main>
```

The `data-context` attribute is used to define the data context for the main element.

### Nested DataContext Example

When a nested `data-context` attribute is defined, the parent context is no longer available within that nested scope. This allows for isolated data management within different sections of the DOM.

```html
<main data-context="context.currentUser" i18n-prefix="main">
    <h1>Welcome <span data-bind data-bind-inner-text="context.name"></span> !</h1>
    <p id="debug2" data-bind data-bind-inner-text="context#json"></p>
    
    <section data-context="context.userDetails">
        <h2>User Details</h2>
        <p>Name: <span data-bind data-bind-inner-text="context.name"></span></p>
        <p>Email: <span data-bind data-bind-inner-text="context.email"></span></p>
    </section>

    <section data-context="context.userSettings">
        <h2>User Settings</h2>
        <p>Theme: <span data-bind data-bind-inner-text="context.theme"></span></p>
        <p>Notifications: <span data-bind data-bind-inner-text="context.notifications"></span></p>
    </section>

    <button on-click="controller.toggleSettings.bind(controller)">Toggle Settings</button>
    <span id="debug" data-bind="{innerText:controller#json}"></span>
    <span id="debug3" data-bind="{innerText:controller.commands#async#json}"></span>

    <ul is="ul-each" each="controller.commands" item-property-name="command">
        <template>
            <li data-bind data-bind-inner-text="command.name"></li>
        </template>
    </ul>
</main>
```

In this example, the `main` element has a `data-context` attribute set to `context.currentUser`. Within this `main` element, there are two nested sections, each with its own `data-context` attribute (`context.userDetails` and `context.userSettings`). The nested contexts ensure that the data within each section is managed independently, and the parent context (`context.currentUser`) is not accessible within these nested sections.
