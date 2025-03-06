---
title: Composite Middleware
parent: Middleware

nav_order: 4
---

# Composite Middleware

## Synchronous variant

The `MiddlewareComposite` class allows combining multiple [middlewares](./), which can be either synchronous or asynchronous.

```typescript
class MiddlewareComposite<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
implements Middleware<T, TSpecialNextParam> {
}
```

## Asynchronous variant

The `MiddlewareCompositeAsync` class allows combining multiple asynchronous [middlewares](./).

```typescript
class MiddlewareCompositeAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
implements MiddlewareAsync<T, TSpecialNextParam> {
}
```
