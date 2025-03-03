# DataBind

The `DataBind` class is an essential part of the Akala framework, extending the `AttributeComposer` class and implementing the `Composer` interface. It provides methods for extending objects, binding data to elements, and applying bindings to elements.

## Overview

The `DataBind` class allows you to bind various properties to HTML elements, such as `innerText`, `style`, and more. It also supports plugins for custom binding logic, making it a versatile tool for data binding in web applications.

## Attributes

`data-bind` can be done in two ways:

- Using a full object: `data-bind="{style:{color:context.name!=='aaa1'?'red':'green'}}"`
- Using sub-attributes: `data-bind-inner-text="context.name"`. Please note that using sub-attributes means you still need to specify the `data-bind` attribute (empty or not). This attribute is required to identify all components that should be targeted by the `DataBind` composer. See [AttributeComposer](attribute-composer.md) for more details.

## Usage Example

In the example below, the `DataBind` class is used to bind data to various elements, such as spans and inputs. This ensures that the data is consistently propagated and managed throughout the DOM tree, enabling efficient data binding and context management.

```html
<main data-context="context.currentUser">
    <h1>Welcome <span data-bind data-bind-inner-text="context.name"></span>!</h1>
    <input type="text" data-bind="{value:context.name}">
</main>
```

## DataBind Plugins

`DataBind` supports plugins, which allow you to extend its functionality by adding custom binding logic. Plugins can be used to handle specific types of bindings or to integrate with other libraries and frameworks.

### Implementers

To implement a `DataBind` plugin, you need to create a class that implements the `DataBindPlugin` interface. This interface requires you to define a `selector` property and a `getBindings` method.

Here's an example of a simple `DataBind` plugin that binds the `value` property of an input element to a binding:

```typescript
import { DataBindPlugin, Binding, ExpressionsWithLength, Subscription } from "@akala/core";
import { subscribe } from "../common.js";

export class InputValueComposer implements DataBindPlugin
{
    readonly selector: string = 'input';
    
    getBindings<const TKey extends PropertyKey>(item: HTMLInputElement, binding: Binding<unknown>, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength): Subscription
    {
        if (member == 'value')
        {
            return subscribe(item, 'input', () => binding.setValue(item.value));
        }
    }
}

// Register the plugin with DataBind
DataBind.plugins.push(new InputValueComposer());
```

In this example, the `InputValueComposer` class implements the `DataBindPlugin` interface. The `selector` property specifies that this plugin applies to `input` elements. The `getBindings` method sets up a subscription to the `input` event of the element and updates the binding's value whenever the input's value changes.

### Using DataBind Plugins

Once a plugin is registered with `DataBind`, it will automatically be used for elements that match the plugin's `selector`. You don't need to do anything special to use the plugin; just bind data to the elements as usual.

For example, with the `InputValueComposer` plugin registered, you can bind the `value` property of an input element like this:

```html
<input type="text" data-bind="{value: context.inputValue}" />
```

The `InputValueComposer` plugin ensures a two-way data binding: The `value` property of the input element is bound to the `context.inputValue` property, and it will update the binding whenever the input's value changes.

By creating and registering custom plugins, you can extend `DataBind` to handle a wide variety of binding scenarios, making it a powerful and flexible tool for data binding in web applications.
