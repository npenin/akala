---
parent: composers
nav_order: 2
---
# AttributeComposer

The `AttributeComposer` class is an abstract class that binds HTML element attributes to a context. It helps create custom attribute composers that parse and apply attribute values to elements.

## Usage Example

To create a custom attribute composer, extend the `AttributeComposer` class and implement its abstract methods.

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
        return DataContext.find(item);
    }

    applyInternal(item: Element, options: { customOption: string }, subItem: PropertyKey, value: unknown): void
    {
        // Implement the logic to apply the value to the element
        item.setAttribute(subItem.toString(), value as string);
    }
}
```

### Using the CustomAttributeComposer

#### Using Direct Attribute

```html
<p custom-attribute="{role=context.role}">
```

#### Using Sub Attributes

```html
<p custom-attribute custom-attribute-role="context.role">
```

In this example, the `CustomAttributeComposer` class extends `AttributeComposer` and implements the `getContext` and `applyInternal` methods. The `apply` method binds the custom attribute to the element.

This example binds the `role` attribute to `context.role`. When `context.role` changes, the `role` attribute updates accordingly.

**WARNING: Changes to the attribute do not update `context.role`.**

In the second example, `<p custom-attribute custom-attribute-role="context.role">`, note the empty `custom-attribute` alongside `custom-attribute-role`. This is intentional. The `CustomAttributeComposer` uses `custom-attribute` as its selector. Since wildcard attribute selectors (`custom-attribute-*`) are not supported in the DOM, adding the empty attribute ensures proper selection and in the most efficient and optimized manner.

## Definition

### Constructor

```typescript
constructor(protected readonly attribute: string, parser?: Parser)
```

- `attribute`: The attribute name to bind.
- `parser`: An optional parser for the attribute value.

### Properties

- `selector`: The CSS selector string for the attribute.
- `optionName`: The attribute name.
- `parser`: The parser for the attribute value.

### Methods

#### optionGetter

```typescript
optionGetter(options: object): T
```

- `options`: An object with options.
- Returns the attribute value from the options.

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
- Applies attribute bindings to the element.

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
