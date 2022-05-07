import State, { RunningContainer, StateConfiguration } from '../state'
import { homedir } from 'os';
import fs from 'fs/promises';
import { join } from 'path';
import pmContainer from '../container';
import { Container, Metadata, ignoredCommands, configure, ServeOptions, SelfDefinedCommand } from '@akala/commands';
import { eachAsync } from '@akala/core';
import { PassThrough, Readable } from 'stream';
import { EventEmitter } from 'events';
import { CliContext } from '@akala/cli';
import Configuration, { ProxyConfiguration } from '@akala/config';

export async function metadata(container: Container<unknown>, deep?: boolean): Promise<Metadata.Container>
{
    const metacontainer: Metadata.Container = { name: container.name || 'unnamed', commands: [] };
    await Promise.all(container.keys().map(async key =>
    {
        if (key === '$injector' || key === '$state' || key === '$container' || ignoredCommands.indexOf(key) > -1 || key == '$init' || key == '$stop')
            return;
        const cmd = container.resolve<Metadata.Command | Container<unknown>>(key);
        if (cmd && cmd.name && Metadata.isCommand(cmd) && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject || [], config: cmd.config });
        else if (cmd instanceof Container && deep)
        {
            if (!isRunningContainer(cmd) || !cmd.running)
                return;
            try
            {
                const subContainer = await cmd.dispatch('$metadata', deep) as Metadata.Container;
                console.log(subContainer);
                if (subContainer && subContainer.commands)
                {
                    subContainer.commands.forEach(c => c.name = key + '.' + c.name)
                    metacontainer.commands.push(...subContainer.commands.filter(c => c.name !== key + '.$init' && c.name !== key + '.$stop'));
                }
            }
            catch (e)
            {
                if (!e || e.statusCode == 404)
                    return;
                throw e;
            }
        }
    }));
    return metacontainer;
}

export function isRunningContainer(c: Container<any>): c is RunningContainer
{
    return 'running' in c;
}

export default async function (this: State, container: RunningContainer & pmContainer.container, context: CliContext<{ config: string }>): Promise<void>
{
    this.isDaemon = true;
    this.processes = {};
    const stderr = process.stderr.write;
    const stderrPT = new PassThrough();
    process.stderr.write = function (...args)
    {
        stderr.call(process.stderr, ...args);
        return stderrPT.write(...args as [any, BufferEncoding]);
    } as any;

    const stdout = process.stdout.write;
    const stdoutPT = new PassThrough();
    process.stdout.write = function (...args)
    {
        stdout.call(process.stdout, ...args);
        return stdoutPT.write(...args as [any, BufferEncoding]);
    } as any;
    container.process = Object.assign(new EventEmitter(), {
        stdout: stdoutPT, stderr: stderrPT, stdio: null, stdin: process.stdin, pid: process.pid, connected: false
        , exitCode: undefined
        , signalCode: undefined
        , spawnargs: process.argv
        , spawnfile: null
        , kill: process.exit.bind(process)
        , send: null
        , disconnect: null
        , unref: null
        , ref: null
        , killed: false
    });

    const configPath = context.options.config || join(homedir(), './.pm.config.json');
    this.config = await Configuration.load<StateConfiguration>(configPath);

    if (this.config)
    {
        if (this.config.mapping.pm.cwd)
            process.chdir(this.config.mapping.pm.cwd);
    }
    else
        this.config = Configuration.new<StateConfiguration>(configPath, {
            containers: { pm: { commandable: true, path: require.resolve('../../commands.json') } },
            mapping: { pm: { cwd: process.cwd(), container: 'pm' } }
        }) as State['config'];

    if (context && context.args.length)
        await container.dispatch('connect', 'pm', context);
    else
    {
        await container.dispatch('connect', 'pm').catch(async e =>
        {
            if (e && e.statusCode == 404)
                await container.dispatch('connect', 'pm', { args: ['local'] });
        });
    }

    await this.config.commit();
    container.name = 'pm';
    const config = container.resolve<Metadata.Configurations>('$metadata.config');
    container.unregister('$metadata');
    container.register(configure(config)(new SelfDefinedCommand(metadata, '$metadata', ['$container', 'param.0'])));


    this.processes[container.name] = container;
    container.running = true;

    try
    {
        await fs.unlink('./pm.sock')
    }
    catch (e)
    {
        if (e.code !== 'ENOENT')
            console.warn(e);
    }

    // var stop = await serve(container as Container<any>, serveMetadata(container.name, options || { _: ['local'] }));

    if (process.disconnect)
    {
        if (process.send)
            process.send('disconnecting daemon');
        process.disconnect();
    }
}