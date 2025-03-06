---
title: EachAsync
parent: Welcome
nav_order: 2
---

# EachAsync

The EachAsync module provides asynchronous iteration functionalities. It provides the same features as [each](each), only with asynchronous support in addition.

## Functions

### each

The `each` function asynchronously iterates over an array or object.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => Promise<void>`

#### Returns

- `Promise<void>`

### grep

The `grep` function asynchronously filters an array or object based on a condition.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => Promise<boolean>`

#### Returns

- `Promise<T[]>`

### map

The `map` function asynchronously maps an array or object to a new array or object.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => Promise<U>`

#### Returns

- `Promise<U[]>`
