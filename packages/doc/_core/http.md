---
title: HTTP
parent: Welcome
nav_order: 2
---

# HTTP

The HTTP module provides functionalities to make HTTP requests.

## Classes

### FetchHttp

The `FetchHttp` class implements the `Http` interface using the Fetch API. This is also the default `$http` service registered.

#### Methods

- `get(url: string, params?: URLSearchParams): PromiseLike<Response>`
- `post(url: string, body?: BodyInit): PromiseLike<FormData>`
- `postJSON<T = string>(url: string, body?: BodyInit): PromiseLike<T>`
- `getJSON<T>(url: string, params?: string | URLSearchParams): PromiseLike<T>`
- `invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean }): PromiseLike<Response>`
- `call<T>(options: HttpOptions<T>): Promise<Response>`

### HttpCallFormatter

The `HttpCallFormatter` class implements the `Formatter` interface for HTTP calls.

#### Methods

- `format(scope: unknown): PromiseLike<Response>`

## Enums

### HttpStatusCode

The `HttpStatusCode` enum provides all HTTP status codes.

#### Values

- `Continue = 100`
- `OK = 200`
- `BadRequest = 400`
- `InternalServerError = 500`
- ... (other status codes)
