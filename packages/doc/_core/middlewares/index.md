---
title: Middleware
nav_order: 3
---

# Middleware

The Middleware module provides a flexible mechanism for handling requests and responses. It supports both synchronous and asynchronous middleware.

Middleware is a core concept in Akala that allows you to define reusable functions that can be applied to requests or other processes. Middleware functions can perform a variety of tasks such as logging, authentication, validation, and more.

## Defining Middleware

Middlewares are generic and will accept any argument that matches their types. Middlewares can be either synchronous or asynchronous.

```typescript
interface Middleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> {
    handle(...context: T): MiddlewareResult<TSpecialNextParam>;
}

interface MiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> {
    handle(...context: T): Promise<MiddlewareResult<TSpecialNextParam>>;
}
```

There is also an [`ErrorMiddleware`](error-middleware) interface which mimics the `Middleware` concept with an additional `Error` as the first argument.

## MiddlewareResult

The `MiddlewareResult` is a special type used in Akala to handle the result of middleware execution. It is important to understand how to use `MiddlewareResult` correctly, as it can be counterintuitive for new users.

A middleware function should return a `MiddlewareResult` to indicate the outcome of its execution. The `MiddlewareResult` can be one of the following:

- `Error`: The error caused during the execution of the middleware. The error will be given to any next error middleware (in the case of a [composite](middleware-composite) middleware), and will then bubble up to all the above middlewares until it reaches the end.
- `undefined`: Use this to indicate the middleware could not process the task and continue the middleware chain.
- `'break'`: Terminates the current composite middleware. In case of running in nested [composite](middleware-composite), only the current composite is stopped, letting siblings and parents handle the execution.

## Detailed Description

Middleware in Akala is designed to be highly flexible and reusable. By defining middleware functions, you can create modular components that handle specific tasks within your application. This allows you to build a robust and maintainable system that can easily be extended and modified.

### Synchronous Middleware

Synchronous middleware functions are executed in a blocking manner. They are useful for tasks that need to be completed before moving on to the next middleware, such as validation or logging.

### Asynchronous Middleware

Asynchronous middleware functions are executed in a non-blocking manner. They are useful for tasks that involve asynchronous operations, such as fetching data from a database or making external API calls.

By understanding how to define and use middleware, as well as how to work with `MiddlewareResult`, you can create a powerful and flexible system for handling requests and responses in your application.

## Conclusion

Middleware is a powerful feature in Akala that allows you to create reusable functions to handle various tasks in your application. Understanding how to define and use middleware, as well as how to work with `MiddlewareResult`, is essential for building robust and maintainable applications with Akala.
