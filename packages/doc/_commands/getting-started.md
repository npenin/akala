---
title: Getting started
---

# Getting Started

Welcome to the Akala Commands guide! Before proceeding, make sure you have followed the [Getting Started with Akala](../getting-started) guide.

## Prerequisites

Ensure you have the following installed:

- Node.js (version 20.x or later)
- [Akala](../getting-started) (installed via npm or Yarn)

## Setting Up Your Client Project

As `@akala/commands` comes bundled if you followed the [Getting Started with Akala](../getting-started) guide, you don't have to do anything specific.

## Creating Your First Command

```bash
akala sdk new cmd my-first-command src/commands
```

This single line in your bash will create a very simple typescript file, in the commands folder (from your current working directory), that will look like the following:

```ts
export default async function myFirstCommand()
{

}
```

**It is strongly recommended to always put all your commands in a dedicated folder. You will see later why.**

Once that is done, the next step would be to configure your command. You may configure it in 2 ways

- using typescript decorators
- using json companion files.

Since typescript decorators are introducing a strong dependency on `@akala/commands`, the second option is preferred.

### Creating Your First Command Companion File

**If you are using typescript, you will need to specify the built folder !**

```bash
akala sdk new cc my-first-command src/commands
```

This single line in your bash will discover your commands and check that the mentioned command has a default exported function. Once the pre-requisites are checked, it wil generate your companion file :

```json
{
    "$schema": "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json",
    "fs": {
        "inject": [
            "param.0",
            "param.1"
        ]
    },
    "": {
        "inject": [
            "param.0",
            "param.1"
        ]
    }
}
```

By default 2 [processors](processors) are configured: fs and default (`""`). A common use case is to configure _at least_ a 3rd one amongst the followings:

- [http](processors/http)
- [html](processors/html)
- [cli](processors/cli)

Now that you have configured your command, you may wonder how to call it. Before that, it could be beneficial to prepare your project for the metadata generation. Indeed, it might be easier to have a single file containing all your commands metadata than depending on your dist folder. To do so, you may just run the `add-script` command of the akala sdk.

```bash
akala sdk add-script dist/commands
```

With this command, you now have a new in your package.json (`generate`) to build that single file containing all your commands. If you want to know more about the add-script command, please refer to the [documentation](sdk/add-script).

Now that you have your script, you may want to run it to get your metadata

```bash
npm run generate

OR 

yarn run generate
```

Now you have your command file that contains all your commands, it will becode easier to run your commands.

### Running your first command

Since the easiest explained is with the CLI, from now on, we will assume your command is configured for [CLI](processors/cli), thus you have a file as following:

```json
{
    "$schema": "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json",
    "fs": {
        "inject": [
            "param.0"
        ]
    },
    "cli": {
        "inject": [
            "param.0"
        ]
    },
    "": {
        "inject": [
            "param.0"
        ]
    }
}
```

To run your first command, the easiest is to register it with `akala`:

```bash
akala commands add mine ./commands.json

OR 

akala commands add mine ./dist/commands # if you did not generate your single metadata commands file
```

**WARNING: The `./` is important as you may also specify remote container metadata files or files from your installed packages, the same considerations as import/require take place**

This is now that the akala magic happens. Since `@akala/cli` can auto-document itself based on the configuration, you may now run:

```bash
akala --help
```

You should now notice that you have a new entry in the help that is `mine`, or whatever name you provided in the previous command. Of course, running help on `mine` will document all your commands and their usage.

Now, running your command is just as simple as

```bash
akala mine my-first-command world
```

Of course, the expected output would be

```bash
hello world
```

## Congratulations

CONGRATULATIONS ! You are now familiar will all the concepts of `@akala/commands` !
