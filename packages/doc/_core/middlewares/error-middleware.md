---
title: Error Middleware
parent: Middleware
nav_order: 4
---

# Error Middleware

The `ErrorMiddleware` interface represents an error-handling middleware, which can be either synchronous or asynchronous.

## Synchronous variant

```typescript
interface ErrorMiddleware<T extends unknown[], U extends string | void = SpecialNextParam> {
    handleError(error: Error | OptionsResponse, ...context: T): MiddlewareResult<U>;
}
```

## Asynchronous variant

```typescript
interface ErrorMiddlewareAsync<T extends unknown[], U extends string | void = SpecialNextParam> {
    handleError(error: Error | OptionsResponse, ...context: T): Promise<MiddlewareResult<U>>;
}
