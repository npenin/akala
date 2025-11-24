import type State from '../state.js'
import type { RunningContainer, StateConfiguration } from '../state.js'
import fs from 'fs/promises';
import pmContainer from '../container.js';
import { Container, Metadata, ignoredCommands, configure, SelfDefinedCommand } from '@akala/commands';
import { PassThrough } from 'stream';
import { buildCliContextFromContext, type CliContext } from '@akala/cli';
import { type ProxyConfiguration } from '@akala/config';
import { fileURLToPath } from 'url';
import { eachAsync, Event } from '@akala/core';
import Process from '../runtimes/process.js';

export async function metadata(container: Container<unknown>, deep?: boolean): Promise<Metadata.Container>
{
    const metacontainer: Metadata.Container = { name: container.name || 'unnamed', commands: [] };
    await Promise.all(container.keys().map(async key =>
    {
        if (key === '$injector' || key === '$state' || key === '$container' || ignoredCommands.indexOf(key) > -1 || key == '$init' || key == '$stop')
            return;
        const cmd = container.resolve<Metadata.Command | Container<unknown>>(key);
        if (cmd && cmd.name && Metadata.isCommand(cmd) && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, config: cmd.config });
        else if (cmd instanceof Container && deep)
        {
            if (!isRunningContainer(cmd) || !cmd.running && !cmd.stateless)
                return;
            try
            {
                const subContainer = await cmd.dispatch('$metadata', deep) as Metadata.Container;
                //console.log(subContainer);
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

export function isRunningContainer(c: Container<unknown>): c is RunningContainer
{
    return 'running' in c;
}

export default async function (this: State, container: RunningContainer & pmContainer.container, context: CliContext<{ configFile: string, keepAttached: boolean, args: string[] }, ProxyConfiguration<StateConfiguration>>): Promise<void>
{
    this.isDaemon = true;
    this.processes = {};
    this.bridges = {};
    const stderr = process.stderr.write;
    const stderrPT = new PassThrough();
    process.stderr.write = function (...args)
    {
        stderr.call(process.stderr, ...args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return stderrPT.write(...args as [any, BufferEncoding]);
    } as typeof process.stderr.write;

    const stdout = process.stdout.write;
    const stdoutPT = new PassThrough();
    process.stdout.write = function (...args)
    {
        stdout.call(process.stdout, ...args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return stdoutPT.write(...args as [any, BufferEncoding]);
    } as typeof process.stdout.write;
    container.process = new Process({
        stdout: stdoutPT,
        stderr: stderrPT,
        stdin: process.stdin
    });

    container.ready = new Event();

    this.config = context.state;

    if (this.config?.mapping?.pm)
    {
        if (this.config.mapping.pm.cwd)
            process.chdir(this.config.mapping.pm.cwd);
    }
    else
    {
        this.config.set('containers', { pm: { commandable: true, stateless: false, path: fileURLToPath(new URL('../../../commands.json', import.meta.url)) } });
        this.config.set('mapping', { pm: { cwd: process.cwd(), container: 'pm' } })
        this.config.set('setup', { packages: [] })
        this.config.set('plugins', [])
    }

    // this.config.mapping['pm'].set('connect', serveMetadata({ options: { ...context.options, socketName: 'pm' }, args: context.options.args as ServeOptions['args'] }));

    if (context?.options?.args?.length)
        await container.dispatch('connect', 'pm', { args: context.options.args, options: context.options });
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
    container.register(configure(config)(new SelfDefinedCommand(metadata, '$metadata', ['$container', 'params.0'])));

    const setup = this.config.setup?.packages;
    if (setup?.length > 0)
    {
        for (const pkg of setup)
        {
            await container.dispatch('install', pkg);
        }
    }

    if (this.config.mapping)
    {
        await eachAsync(this.config.mapping.extract(), async (mapping, name) =>
        {
            if (mapping.autostart)
                container.ready.addListener(() => container.dispatch('start', name, { autostart: true, wait: true }, buildCliContextFromContext(context, ...(mapping.cli || []))));
        });
    }

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
        if (!context.options.keepAttached)
        {
            if (process.send)
                await new Promise<void>((resolve, reject) => process.send('disconnecting daemon', err => err ? reject(err) : resolve()));
            process.disconnect();
        }
    }

    context.abort.signal.addEventListener('abort', async () =>
    {
        await container.dispatch('stop', { params: ['pm'] });
    });
}
