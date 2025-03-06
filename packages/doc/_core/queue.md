---
title: Queue
parent: Welcome
nav_order: 2
---

# Queue

The Queue module provides a simple queue implementation.

## Classes

### Queue

The `Queue` class represents a queue. The save function will not save anything in the core package. However, if the `throw` parameter is set to true, it will always throw an Error.

#### Methods

- `enqueue(message: T): void`
- `save(_throw?: boolean): void`
- `process(): void`
