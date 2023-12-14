import { Container, Processors, Metadata, Cli, updateCommands } from "@akala/commands";
import State, { RunningContainer, SidecarMetadata } from '../state.js';
import { spawn, ChildProcess, StdioOptions } from "child_process";
import pmContainer from '../container.js';
import { Deferred, eachAsync } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { CliContext, unparseOptions } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import getRandomName from "../commands/name.js";
import { ProxyConfiguration } from "@akala/config";
import { IpcAdapter } from "../ipc-adapter.js";
import path from 'path'
import { fileURLToPath } from 'url'

//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, context?: CliContext<{ new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    let args: string[];

    if (!context.options.name && context.options.new)
        context.options.name = getRandomName();
    else if (!context.options.name)
        context.options.name = name;

    if (this.isDaemon)
        throw new ErrorWithStatus(40, 'pm is already running');
    else
    {
        if (name != 'pm')
            throw new ErrorWithStatus(40, 'this command needs to run through daemon process');

        args = [...context.args, ...unparseOptions({ ...context.options, inspect: undefined })];
    }

    args.unshift(path.resolve(_dirname, '../fork'))

    if (context.options && context.options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (context.options && context.options.verbose)
        args.push('-v')

    let cp: ChildProcess;
    if (context.options.keepAttached)
        cp = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
    else
        cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    cp.on('exit', function (...args: unknown[])
    {
        console.log(args);
    })
    cp.on('message', function (message)
    {
        console.log(message);
        // cp.disconnect();
    });
    return new Promise<void>((resolve) =>
    {
        cp.on('disconnect', function ()
        {
            if (!context.options.keepAttached)
                cp.unref();
            console.log('pm started');
            resolve();
        })
    })
}

start.$inject = ['$container', 'param.0', 'options']