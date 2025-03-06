---
title: Each
parent: Welcome
nav_order: 2
---

# Each

The Each module provides functionalities to iterate over arrays and objects. The purpose here is to mimic the jQuery `$.each`.

## Functions

### each

The `each` function iterates over an array or object.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => void`

#### Returns

- `void`

### grep

The `grep` function filters an array or object based on a condition.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => boolean`

#### Returns

- `T[]`

### map

The `map` function maps an array or object to a new array or object.

#### Parameters

- `array: T[] | ArrayLike<T>`
- `body: (element: T, i: number) => U`

#### Returns

- `U[]`
