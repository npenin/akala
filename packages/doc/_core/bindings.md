---
title: Bindings
parent: Welcome
nav_order: 2
---
# Bindings

## History

Initally the binding idea came from .NET WPF. There we have the binding concept and the possibility to have 2 way data bindings. Then came angularjs with another presentation of 2 way data bindings. The approach taken here is to make fully accessible, just as another building block.

## Usage

Bindings are very easy to use and have 1 clear limitation (for now): they only support the . (dot) notation.
see examples below :

```ts
var o={x:{a:1, b:2, c:3}, a:[{a:4, b:5, c:6}], foo:'bar'}
var bindingXA=new Binding('x.a', o);
o.x.a=-1 // does not trigger binding update as used outside of binding "context"
var setterXA=Binding.getSetter(o, 'x.a');
setterXA(-1);
```
