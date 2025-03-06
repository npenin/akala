---
title: Orchestrator
parent: Welcome
nav_order: 2
---

# Orchestrator

The Orchestrator module provides functionalities to manage tasks and their dependencies.

## Classes

### Orchestrator

The `Orchestrator` class manages tasks and their dependencies.

#### Methods

- `add(name: string, dependencies: string[], action?: () => void | Promise<void>): void`
- `start(...names: string[]): Promise<void>`
