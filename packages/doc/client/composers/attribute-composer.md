# AttributeComposer

The `AttributeComposer` class is an abstract class that provides a way to bind attributes of an HTML element to a context. It is used to create custom attribute composers that can parse and apply attribute values to elements.

## Usage Example

To create a custom attribute composer, extend the `AttributeComposer` class and implement the abstract methods.

### Example: CustomAttributeComposer

```typescript
import { AttributeComposer } from './shared';
import { Binding } from '@akala/core';

class CustomAttributeComposer extends AttributeComposer<{ customOption: string }>
{
    constructor()
    {
        super('custom-attribute');
    }

    getContext(item: Element, options?: { customOption: string }): Binding<unknown>
    {
        return DataContext.find(item)
    }

    applyInternal(item: Element, options: { customOption: string }, subItem: PropertyKey, value: unknown): void
    {
        // Implement the logic to apply the value to the element
        item.setAttribute(subItem.toString(), value as string);
    }
}
```

### Using the CustomAttributeComposer

```html
<p custom-attribute="{role=context.role}">
```

OR

```html
<p custom-attribute custom-attribute-role="context.role">
```

In this example, the `CustomAttributeComposer` class extends the `AttributeComposer` class and implements the `getContext` and `applyInternal` methods. The `apply` method is then used to bind the custom attribute to the element.

This little example will bing the role attribute to the context.role value. Each time the role value will change in the [data context](datacontext), the role attribute will get updated.

**WARNING: the opposite is not true, if the attribute changes, it will not automatically update the `context.role` value.**

## Definition

### Constructor

```typescript
constructor(protected readonly attribute: string, parser?: Parser)
```

- `attribute`: The name of the attribute to bind.
- `parser`: An optional parser to parse the attribute value.

### Properties

- `selector`: A string representing the CSS selector for the attribute.
- `optionName`: The name of the attribute.
- `parser`: The parser used to parse the attribute value.

### Methods

#### optionGetter

```typescript
optionGetter(options: object): T
```

- `options`: An object containing the options.
- Returns the value of the attribute from the options.

#### getContext

```typescript
abstract getContext(item: Element, options?: T): Binding<unknown>
```

- `item`: The HTML element.
- `options`: Optional options.
- Returns a binding context for the element.

#### applyInternal

```typescript
abstract applyInternal<const TKey extends PropertyKey>(item: Element, options: T, subItem: TKey, value: unknown): Subscription | void
```

- `item`: The HTML element.
- `options`: The options.
- `subItem`: The sub-item key.
- `value`: The value to apply.
- Applies the value to the element and returns a subscription or void.

#### apply

```typescript
apply(item: Element, options: T, root: Element | ShadowRoot)
```

- `item`: The HTML element.
- `options`: The options.
- `root`: The root element or shadow root.
- Applies the attribute bindings to the element.

#### getBindings

```typescript
getBindings<const TKey extends PropertyKey>(item: Element, options: T, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength)
```

- `item`: The HTML element.
- `options`: The options.
- `context`: The binding context.
- `member`: The member key.
- `source`: The source expression.
- Returns the bindings for the element.
