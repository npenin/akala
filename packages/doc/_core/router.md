---
title: Router
parent: Welcome
nav_order: 2
---

# Router

The Router module provides routing functionalities. It serves as the base routing mechanism for both [client](../client/services/router) and [server](../server/router). Leveraging the [middleware](middlewares) concept, it will keep testing all the middleware until a middleware *throws* a result.

## Detailed Description

The `Router` and `RouterAsync` classes are designed to provide a robust and flexible routing mechanism for your application. By leveraging middleware, these classes allow you to define routes and handle requests in a modular and reusable way.

### Router

The `Router` class is used for synchronous routing. It allows you to define routes and middleware that will be executed in a synchronous manner. This is useful for scenarios where you need to handle requests quickly and do not require asynchronous operations.

### RouterAsync

The `RouterAsync` class is used for asynchronous routing. It allows you to define routes and middleware that will be executed asynchronously. This is useful for scenarios where you need to perform asynchronous operations, such as fetching data from a database or making external API calls.

Both classes provide methods for defining routes, adding middleware, and using predefined routes. By using these classes, you can create a flexible and maintainable routing system for your application.

## Classes

### Router

The `Router` class implements synchronous routing.

#### Methods

- `route(...args: RouteBuilderArguments): MiddlewareRoute<T>`
- `useRoutes(routes: Routes<T, unknown>): this`
- `useMiddleware(route: string | UriTemplate, ...middlewares: Middleware<T>[]): this`
- `use(...middlewares: ((...args: T) => unknown)[]): this`

### RouterAsync

The `RouterAsync` class implements asynchronous routing.

#### Methods

- `route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T>`
- `useRoutes(routes: Routes<T, Promise<unknown>>): this`
- `useMiddleware(route: string | UriTemplate, ...middlewares: MiddlewareAsync<T>[]): this`
- `use(...middlewares: ((...args: T) => Promise<unknown>)[]): this`
