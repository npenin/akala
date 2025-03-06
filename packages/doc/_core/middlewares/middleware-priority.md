---
title: Middleware Priority
parent: Middleware

nav_order: 4
---

# Middleware with Priority

Middleware with priority allows you to control the order in which middlewares are executed. By assigning a priority value to each middleware, you can ensure that certain middlewares run before or after others, providing greater control over the middleware execution flow.

## Synchronous variant

The `MiddlewareCompositeWithPriority` class allows indexing [middlewares](./), which can be either synchronous or asynchronous.

```typescript
export class MiddlewareCompositeWithPriority<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
implements MiddlewareAsync<T, TSpecialNextParam>
{
    useMiddleware(priority: number, ...middlewares: AnySyncMiddleware<T, TSpecialNextParam>[]): this;

    use(priority: number, ...middlewares: ((...args: T) => unknown)[]): this;
}
```

## Asynchronous variant

The `MiddlewareCompositeWithPriorityAsync` class allows indexing asynchronous [middlewares](./).

```typescript
export class MiddlewareCompositeWithPriorityAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
implements MiddlewareAsync<T, TSpecialNextParam>
{
    useMiddleware(priority: number, ...middlewares: AnyAsyncMiddleware<T, TSpecialNextParam>[]): this;

    use(priority: number, ...middlewares: ((...args: T) => Promise<unknown>)[]): this;
}
```
