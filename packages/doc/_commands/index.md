---
title: Welcome
---

# Welcome

Commands is the second foundation block in the akala stack that allows running, well... commands.

You may want to check a live project to see how commands can be written: [see in pm commands](https://github.com/npenin/akala/tree/main/packages/pm/src/commands).
Typescript is preferred, but not mandatory.

## Get started

To get started, just follow the [instructions](getting-started)

## History

Starting commands block came from a simple idea: combining server less functions and redux approaches would be awesome. So here it is.

## Hello world

A command consist of any javascript file that exports a default function. You may also configure injection based on various processors (jsonrpc, cli, ...).

status.ts

```ts
export default async function status(name?: string)
{
    console.log('hello '+name);
};

exports.default.inject = ['param.0']
```
