---
title: Middleware
nav_order: 3
---

# Middleware

The Middleware module provides a flexible mechanism for handling requests and responses. It supports both synchronous and asynchronous middleware.

Middleware is a core concept in Akala that allows you to define reusable functions that can be applied to requests or other processes. Middleware functions can perform a variety of tasks such as logging, authentication, validation, and more.

## Defining Middleware

Middlewares are generic and will accept any argument that matches its types.

The `Middleware` interface represents a middleware, which can be either synchronous or asynchronous.

```typescript
interface Middleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> {
    handle(...context: T): MiddlewareResult<TSpecialNextParam>;
}

interface MiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> {
    handle(...context: T): Promise<MiddlewareResult<TSpecialNextParam>>;
}
```

## MiddlewareResult

The `MiddlewareResult` is a special type used in Akala to handle the result of middleware execution. It is important to understand how to use `MiddlewareResult` correctly, as it can be counterintuitive for new users.

A middleware function should return a `MiddlewareResult` to indicate the outcome of its execution. The `MiddlewareResult` can be one of the following:

- `Error`: The error caused during the execution of the middleware. The error will be given to any next error middleware (in the case of a [composite](middleware-composite) middleware), and will then bubble up to all the above middlewares until it reaches the end.
- `undefined`: Use this to indicate the middleware could not process the task and continue the middleware chain.
- `'break'`: Terminates the current composite middleware. In case running in nested [composite](middleware-composite), only the current composite is stopped, letting siblings and parents handle the execution.

## Conclusion

Middleware is a powerful feature in Akala that allows you to create reusable functions to handle various tasks in your application. Understanding how to define and use middleware, as well as how to work with `MiddlewareResult`, is essential for building robust and maintainable applications with Akala.

## Types

For more details on each type of middleware, refer to the following sections:

- [Composite](middleware-composite)
- [Indexed](middleware-indexed)
- [Priority](middleware-priority)
- [ErrorMiddleware](error-middleware)
- [Utility Functions](utilities)
