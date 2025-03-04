---
title: Processors & Triggers
parent: Akala Commands

---

# Command Processors/Triggers

Even though it makes a hude difference, there is a thin line between processors and triggers. Triggers are independent and might or not trigger a command based on their own logic. Processors on the other hand are running commands through their own logic.

Example given: The most explicit example would be http which exists both as a processor and a trigger :

- the `http` processor will take the command metadata and invoke the proper route, query string, headers, ... based on the provided data.
- the `http` trigger will wait match routes, query string, headers, ... to trigger the approriate command (which would run through its own processor)

## Processors

- [http](http)
- [html](html)
- [fs](fs)
- [local](local)
- [jsonrpc](local)
- [schema validator](schema-validator)

## Triggers

- [cli](cli)
- [http](http)
- [html](html)
- [hotkey](hotkey)
