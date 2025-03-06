---
title: Router
parent: Welcome
nav_order: 2
---

# Router

The Router module provides routing functionalities. It serves as the base routing mechanism for both [client](../client/services/router) and [server](../server/router). Leveraging the [middleware](middlewares) concept, it will keep testing all the middleware until a middleware *throws* a result.

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
