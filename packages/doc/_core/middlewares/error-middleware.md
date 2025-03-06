---
title: ErrorMiddleware
parent: Middleware
nav_order: 4
---

# ErrorMiddleware

The `ErrorMiddleware` interface represents an error-handling middleware, which can be either synchronous or asynchronous.

```typescript
interface ErrorMiddleware<T extends unknown[], U extends string | void = SpecialNextParam> {
    handleError(error: Error | OptionsResponse, ...context: T): MiddlewareResult<U>;
}
```

```typescript
interface ErrorMiddlewareAsync<T extends unknown[], U extends string | void = SpecialNextParam> {
    handleError(error: Error | OptionsResponse, ...context: T): Promise<MiddlewareResult<U>>;
}
