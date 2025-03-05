---
parent: Welcome
nav_order: 2
---

# Events

## Event

The `Event` class represents an individual event and provides methods to manage listeners and emit the event.

### Methods

- `addListener(listener: Function, options?: { once?: boolean }): Subscription`
  - Adds a listener to the event.

- `removeListener(listener: Function): boolean`
  - Removes a listener from the event.

- `emit(...args: any[]): any`
  - Emits the event with the provided arguments.

- `pipe(event: Event): Subscription`
  - Pipes the event to another event.

- `[Symbol.dispose](): void`
  - Disposes of the event and all its listeners.

## AsyncEvent

The `AsyncEvent` class extends `Event` to handle asynchronous listeners.

### Methods

- `addListener(listener: Function, options?: { once?: boolean }): Subscription`
  - Adds an asynchronous listener to the event.

- `emit(...args: any[]): Promise<any>`
  - Emits the event with the provided arguments and returns a promise.

## ReplayEvent

The `ReplayEvent` class extends `Event` to replay the last emitted events to new listeners.

### Methods

- `emit(...args: any[]): any`
  - Emits the event with the provided arguments and stores them in a buffer.

- `addListener(listener: Function, options?: { once?: boolean }): Subscription`
  - Adds a listener to the event and replays the buffered events.

## PipeEvent

The `PipeEvent` class extends `Event` to map and pipe events from one source to another.

### Methods

- `addListener(listener: Function, options?: { once?: boolean }): Subscription`
  - Adds a listener to the event and subscribes to the source event if required.

- `removeListener(listener: Function): boolean`
  - Removes a listener from the event and unsubscribes from the source event if there are no more listeners.

## EventEmitter

The `EventEmitter` class is used to handle events in a structured way. It allows you to define, emit, and listen to events.

### Usage

```typescript
import { EventEmitter } from 'path-to-event-emitter';

const emitter = new EventEmitter();

emitter.on('eventName', (arg1, arg2) => {
    console.log(arg1, arg2);
});

emitter.emit('eventName', 'arg1', 'arg2');
```

### Methods

- `hasListener(eventName: string | symbol): boolean`
  - Checks if there are any listeners for the specified event.

- `setAsync(eventName: string | symbol): void`
  - Sets the specified event to be asynchronous.

- `set(eventName: string | symbol, event: Event): void`
  - Sets a custom event for the specified event name.

- `get(eventName: string | symbol): Event`
  - Gets the event associated with the specified event name.

- `getOrCreate(eventName: string | symbol): Event`
  - Gets the event associated with the specified event name, or creates it if it doesn't exist.

- `setMaxListeners(maxListeners: number, eventName?: string | symbol): void`
  - Sets the maximum number of listeners for the specified event.

- `emit(eventName: string | symbol, ...args: any[]): boolean`
  - Emits the specified event with the provided arguments.

- `on(eventName: string | symbol, listener: Function, options?: { once?: boolean }): Subscription`
  - Adds a listener for the specified event.

- `once(eventName: string | symbol, listener: Function, options?: { once?: boolean }): Subscription`
  - Adds a one-time listener for the specified event.

- `off(eventName: string | symbol, listener: Function): boolean`
  - Removes the specified listener for the event.

- `[Symbol.dispose](): void`
  - Disposes of the event emitter and all its listeners.
