---
title: Bindings & Observables
parent: Welcome
nav_order: 2
---

## Observables

### ObservableObject

`ObservableObject` is a class that wraps an object and allows you to watch for changes on its properties. It emits [events](events) whenever a property value changes.

#### Usage

```ts
import { ObservableObject } from '@akala/core';

const obj = { a: 1, b: 2 };
const observableObj = new ObservableObject(obj);

observableObj.on('a', (event) => {
    console.log(`Property 'a' changed from ${event.oldValue} to ${event.value}`);
});

observableObj.setValue('a', 3); // This will trigger the event and log: Property 'a' changed from 1 to 3
obj.a = 1; // This will NOT trigger the event
```

### ObservableArray

`ObservableArray` is a class that wraps an array and allows you to watch for changes on its elements. It emits [events](events) whenever the array is modified (e.g., push, pop, shift, unshift, replace). This event informs about what action happened and what are the old and new items.

#### Usage

```ts
import { ObservableArray } from '@akala/core';

const arr = [1, 2, 3];
const observableArr = new ObservableArray(arr);

observableArr.addListener((event) => {
    console.log(`Array changed: ${event.action}`);
});

observableArr.push(4); // This will trigger the event and log: Array changed: push
```

## Bindings

### History

Initally the binding idea came from .NET WPF. There we have the binding concept and the possibility to have 2 way data bindings. Then came angularjs, and angular, with another presentation of 2 way data bindings. The approach taken here is to make fully accessible, just as another building block.

### Usage

Bindings are very easy to use and have 1 clear limitation (for now): they only support the . (dot) notation.
see examples below :

```ts
var o={x:{a:1, b:2, c:3}, a:[{a:4, b:5, c:6}], foo:'bar'}
var bindingXA=new Binding('x.a', o);

bindingXA.onChanged(event => {
    console.log(`Property 'a' changed from ${event.oldValue} to ${event.value}`);
})
o.x.a=-1 // does not trigger binding update as used outside of binding "context"

bindingXA.setValue(-1); // This will trigger the event and log: Property 'a' changed from 1 to -1
```

Since bindings are relying on Observables (see above), you may also do the following:

```ts
ObservableObject.setValue(o, 'a', -1); // This will also trigger the binding changed event
```

*OR*

```ts
new ObservableObject(a).setValue('a', -1); // This will also trigger the binding changed event
```
