# CLI Trigger

The CLI trigger expects a dedicated command metadata section. Below is the `add-script` companion file :

```json
{
    "$schema": "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json",
    "": {
        "inject": [
            "param.0",
            "param.1",
            "param.2",
            "param.3"
        ]
    },
    "cli": {
        "inject": [
            "options.name",
            "options.commands",
            "options.metadataFile",
            "options.typescriptFile"
        ],
        "usage": "add-script <commands> [typescriptFile] [metadataFile]",
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
        "description": "Adds scripts generate (and generate-metadata if `typescriptFile` is present) to the closest package.json\nif `name` is provided, generated scripts names are suffixed with the provided name",
        "inject": [
            "name of the container to be used",
            "path to the folder containing the commands",
            "path to the metadata file to get generated"
        ]
    }
}
```

## Usage

The usage property is indicating how you are expecting users to run the command with mandatory and/or optional positional arguments.

In our example, `add-script <commands> [typescriptFile] [metadataFile]`, defines 1 mandatory (`commands`) and 2 optional arguments (`typescriptFile` and `metadataFile`).

## Options

You may specify more information about your CLI options. In our example above, the `name` option is specified to enforce it not being considered as a flag, but really an option with a value.

The second option specified is `commands`. In this case, since the name is the same one of the positinal argument, it is referring to the mandatory `commands` positional argument. Here we are asking the `@akala/cli` to normalize the provided path so that a full path can be inferred based on the current working directory.

More information can be found in the [`@akala/cli`](../../cli) documentation.

## Inject

Please refer to the [companion files](../companion-files) page to understand better the inject property.

### What can be injected

The CLI trigger will provide some CLI related information in addition to [other native "injectables"](../companion-files)

- `context` which is the `CliContext`
- `options` which is exactly the same as `context.options`, but makes it shorter.
- `stdin` which is as its name suggests, the **string** that would get read from stdin. Should you need a stream your command would need to check validity and use the standard nodejs API.
