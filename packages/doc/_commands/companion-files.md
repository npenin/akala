---
title: Companion Files
parent: Welcome
nav_order: 2
---

# Companion Files

Companion files are JSON files that provide metadata and configuration for commands. They help define how commands should be executed, what parameters they require, and how they interact with different processors and triggers.

## Structure

A typical companion file includes sections for schema validation, injection, usage, and options. Here is an example structure:

```json
{
    "$schema": "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json",
    "": {
        "inject": [
            "param.0",
            "param.1"
        ]
    },
    "cli": {
        "inject": [
            "options.name",
            "options.commands"
        ],
        "usage": "command <name> [commands]",
        "options": {
            "name": {
                "needsValue": true
            },
            "commands": {
                "normalize": true
            }
        }
    },
    "doc": {
        "description": "Description of the command",
        "inject": [
            "description parameter 1",
            "description parameter 2"
        ]
    }
}
```

## Schema

It is strongly recommended to specify the schema to command companions: <https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json>. It would heavily simplify your companion file writing by providing intellisense in tools like VSCode.

## Configuration Sections

You are free to provide any configuration section. In the above example, there are 3 sections:

- `""` the default section that is basically what is used as a fallback if a trigger or processor does not have its dedicated section.
- `"cli"` will configure the [CLI Trigger](../cli).
- `"doc"` is not used by a dedicated processor or trigger specifically. Instead, it may be used by various triggers or processors to document how to invoke/run the command to the user. In our example, since only the `cli` trigger is configured, when running our cli, we would see something as following:

```bash
command

Description of the command

Options:
    --name      description parameter 1
    --commands  description parameter 2
```

### Inject

The `inject` property specifies dependencies that should be injected into the command when it is executed. By default, inject would provide the following valid "injectables":

- `$container` that contains the command processor(s) and all the commands (including the currently invoked one).
- `trigger` that contains the trigger name. If `undefined`, that would mean the command was directly invoked through javascript (or an improper command processor implementation)
- Any "injectable" registered in the core [`defaultInjector`](../core/default-injector)

### Example

Refer to the [CLI Trigger](../cli) documentation for a more detailed example of a companion file.
