import type State from '../state.js';
import { type StdioOptions } from "child_process";
import { type CliContext, unparseOptions } from "@akala/cli";
import ChildProcess from '../runtimes/child_process.js'

export default async function start(this: State, name: string, context?: CliContext<{ configFile: string, new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: number, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    const args = [...context.args, ...unparseOptions({
        ...context.options,
        configFile: context.options.configFile,
        name: 'pm',
        program: new URL('../../../commands.json', import.meta.url).toString(),
        inspect: undefined, new: undefined, wait: undefined
    })];

    const cp = await ChildProcess.build(args, { ...context.options, inheritStdio: true }, context.abort.signal);
    cp.on('exit', function (...args: unknown[])
    {
        console.log(args);
    })
    cp.on('message', function (message)
    {
        console.log(message);
    });

    return new Promise<void>((resolve) =>
    {
        cp.on('disconnect', function ()
        {
            if (!context.options.keepAttached)
            {
                cp.unref();
                console.log('pm started');
            }
            resolve();
        })
    });
}

start.$inject = ['$container', 'params.0', 'options']
