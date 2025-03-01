# Getting Started with Akala CLI

Welcome to the Akala Client guide! Before proceeding, make sure you have followed the [Getting Started with Akala](../getting-started) guide.

## Prerequisites

Ensure you have the following installed:

- Node.js (version 20.x or later)
- [Akala](../getting-started.md) (installed via npm or Yarn)

## Setting Up Your CLI Project

To work with akala cli, you will first of all need to install it.

Akala will automatically detect which package manager you are using to install the package.

Package managers are detected based on the presence of specific files :

|Package manager| File detection |
|---|---|
|yarn|yarn.lock|
|npm| *fallback* |

From here you have 2 possibilities to work on CLI :

- you may want to create you own CLI
- you may want to enrich akala with more features

## Custom CLI

Here too, you have 2 possibilities to create your own CLI

- use directly @akala/cli and write your commands
- use @akala/commands to build commands that could run anywhere node is supported

### Using @akala/cli

`@akala/cli` is not that different from `yargs`. It provides a simple API to declare what your CLI will allow the user to do.

Here is a simple example of what's achievable. This example has been extracted from an actual source file of the akala framework: the [pm](../pm) cli

```ts
import { program } from '@akala/cli';

type CliOptions = { output: string, verbose: boolean, pmSock: string | number, tls: boolean, help: boolean };

const cli = program.options<CliOptions>({ 
    output: { aliases: ['o'], needsValue: true, doc: 'output as `table` if array otherwise falls back to standard node output' }, 
    verbose: { aliases: ['v'] }, 
    tls: { doc: "enables tls connection to the `pmSock`" }, 
    pmSock: { aliases: ['pm-sock'], needsValue: true, doc: "path to the unix socket or destination in the form host:port" }, 
    help: { doc: "displays this help message" } });

cli.command('start pm')
    .option('inspect', { doc: "starts the process with --inspect-brk parameter to help debugging" })
    .option('keepAttached', { doc: "keeps the process attached" })
    .action(c =>
    {
        // Do whatever you want
    });
```

This code does multiple things:

- it registers options to be use in the general command line (for any command): output, verbose, tls, pmSock and help.
  - these are defined by a name which is the expected name to be provided in the CLI arguments (prefixed with a `--`)
  - some options have a docuumentation provided which would get displayed upon using the `--help` argument
  - some options have aliases defined, this helps to have shorter CLI arguments.
  - some options `needsValue`, which means the next argument is expected to contain the value of the argument (if not provided with an `=`)
- it registers a `start pm` command which has its own options. These options are valid (and will be parsed only if the command matches)

This code example is an example of a single command, you may split command/option registrations in multiples file if you want to.

In the main file, you would just need to process the actual CLI:

```ts
import {  buildCliContextFromProcess } from '@akala/cli';

cli.process(buildCliContextFromProcess())
```

### Using [@akala/commands](../commands.md)

Here the usage is way simpler. In the entrypoint of your CLI, you just need these few lines of code:

```ts
#!/usr/bin/env -S node
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Cli } from './index.js';

const cli = await Cli.fromFileSystem('<absolute path to your commands folder>');
await cli.start();
```

Each of your command is just a simple javascript/typescript file with a default export as a function.
Next to your file, you will need a json file to explain how this command can be used.

```json
{
    "$schema": "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json",
    "": {
        "inject": [
            "param.0",
            "param.1"
        ]
    },
    "fs": {
        "inject": [
            "param.0",
            "param.1"
        ]
    },
    "cli": {
        "usage": "<key>",
        "inject": [
            "options.key",
            "options.file"
        ],
        "options": {
            "file":{
                "alias": [
                        "c"
                    ],
                "normalize": true
            }
        }
    }
}
```

Here this file declares many things:

- what are the parameters and how to get them from the CLI(cli/inject property)
- how to provide the key options (cli/usage property). Here we know the key property is mandatory. Should it be optional, we could have used brackets (`[key]`) instead of `<key>`.
- what are the options. Here we have just 1 configured option. This option has
  - an alias a -c to make the CLI arguments shorter
  - it will normalize the value as it comes from the CLI to an absolute path.

The implemtentation can be just as simple as the following:

```ts
import Configuration from '@akala/config';

export default async function get(this: Configuration, key: string, file?: string)
{
    if (!file)
        return this.get(key);
    return (await Configuration.load(file)).get(key);
}
```

## Learn More

To learn more about Akala and its features, visit the whole [framework documentation](https://akala.js.org/).

Happy coding!
