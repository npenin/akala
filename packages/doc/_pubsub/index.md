---
title: PubSub Module
---
# PubSub Module

## Overview
The `pubsub` module provides a publish-subscribe messaging framework within the Akala ecosystem. It enables decoupled communication between components through topics and events.

## Installation
To install the `pubsub` module, use the following command:

```bash
npm install @akala/pubsub
```

## Usage
Import the module and use its features as follows:

```javascript
import * as pubsub from '@akala/pubsub';

// Example usage
const topic = pubsub.createTopic('exampleTopic');
topic.subscribe((message) => console.log('Received:', message));
topic.publish('Hello, world!');
```

## API Reference

| Method | Description |
| --- | --- |
| `createTopic(name: string): Topic` | Creates a new topic with the specified name. |
| `Topic.subscribe(callback: (message: any) => void): void` | Subscribes to the topic with the provided callback function. |
| `Topic.publish(message: any): void` | Publishes a message to the topic. |

## Examples

### Create and Use a Topic
```javascript
import * as pubsub from '@akala/pubsub';

// Create a topic
const topic = pubsub.createTopic('exampleTopic');

// Subscribe to the topic
topic.subscribe((message) => {
    console.log('Received message:', message);
});

// Publish a message
topic.publish('Hello, world!');
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.