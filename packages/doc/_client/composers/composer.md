---
parent: composers
nav_order: 2
---
# Composer

Composer is a core concept in Akala client. It helps converting raw HTML to a living application.

## Implementers

To implement a composer, you only need to implement the `Composer` interface.

## Interface Definition

The `Composer` interface is defined as follows:

```typescript
export interface Composer<TOptions = unknown>
{
    selector: string | string[];
    optionGetter(options: object): TOptions;
    apply(items: Element, options?: TOptions, futureParent?: Element | DocumentFragment): Disposable;
}
```

### Properties

- `selector`: A string or an array of strings that specifies the CSS selectors for the elements that the composer will apply to.
- `optionGetter(options: object): TOptions`: A method that extracts the options for the composer from the root options object (you may define that during as a [bootstrap](../bootstrap.md) parameter).
- `apply(items: Element, options?: TOptions, futureParent?: Element | DocumentFragment): Disposable`: A method that applies the composer to the specified elements. It returns a `Disposable` object that can be used to clean up the applied composer.

### Generic Parameter

- `TOptions`: This generic parameter allows you to specify the type of options that the composer will use. By default, it is set to `unknown`. You can define a specific type for the options to ensure type safety and better code completion in your IDE.

### Example Implementation

Here is an example of how to implement a simple composer:

```typescript
import { Composer } from './template';

interface MyOptions {
    myOption: string;
}

class MyComposer implements Composer<MyOptions>
{
    selector = 'my-element';

    optionGetter(options: object): MyOptions
    {
        return options['myOptions'];
    }

    apply(items: Element, options?: MyOptions, futureParent?: Element | DocumentFragment)
    {
        // Apply the composer logic to the items
        items.innerHTML = `Composed content with option: ${options?.myOption}`;
        return {
            [Symbol.dispose]() {
                // Clean up logic
                items.innerHTML = '';
            }
        };
    }
}
```

In this example, the `MyComposer` class implements the `Composer` interface with a specific type for `TOptions` (`MyOptions`). It defines a `selector` for the elements it will apply to, an `optionGetter` method to extract options, and an `apply` method to apply the composer logic to the elements.
