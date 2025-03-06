---
title: Utilities
parent: Middleware
nav_order: 4
---

# Utilities

## convertToMiddleware

Converts a function to a middleware. It will also handle for you the conversion to [MiddlewareResult](./)

```typescript
function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (...args: T) => Promise<unknown>): MiddlewareAsync<T, TSpecialNextParam>;
function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => TReturnType): Middleware<T, TSpecialNextParam>;
```

## convertToErrorMiddleware

Converts a function to an error-handling middleware. It will also handle for you the conversion to [MiddlewareResult](./)

```typescript
function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => Promise<unknown>): ErrorMiddlewareAsync<T, TSpecialNextParam>;
function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => unknown): ErrorMiddleware<T, TSpecialNextParam>;
```
