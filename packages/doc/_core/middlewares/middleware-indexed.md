---
title: Indexed Middleware
parent: Middleware
nav_order: 4
---

# Indexed Middleware

## Synchronous variant

The `MiddlewareIndexed` class allows indexing [middlewares](./), which can be either synchronous or asynchronous.

```typescript
class MiddlewareIndexed<T extends unknown[], TMiddleware extends AnyMiddleware<T, TSpecialNextParam>, TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam> {
}
```

## Asynchronous variant

The `MiddlewareIndexedAsync` class allows indexing asynchronous [middlewares](./).

```typescript
class MiddlewareIndexedAsync<T extends unknown[], TMiddleware extends AnyAsyncMiddleware<T>> implements MiddlewareAsync<T> {
}
```
