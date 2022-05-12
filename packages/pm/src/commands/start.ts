import { Container, Processors, Metadata, registerCommands, Cli } from "@akala/commands";
import State, { RunningContainer, SidecarMetadata } from '../state';
import { spawn, ChildProcess, StdioOptions } from "child_process";
import pmContainer from '../container';
import * as jsonrpc from '@akala/json-rpc-ws'
import { eachAsync, logger } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { CliContext, ErrorWithStatus } from "@akala/cli";
import getRandomName from "./name";
import { ProxyConfiguration } from "@akala/config";
import { IpcAdapter } from "../ipc-adapter";

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, context?: CliContext<{ new?: boolean, name: string, inspect?: boolean, verbose?: boolean, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    let args: string[];

    if (!context.options.name && context.options.new)
        context.options.name = getRandomName();
    else if (!context.options.name)
        context.options.name = name;


    if (this.isDaemon)
    {
        var instanceConfig = this.config.mapping[context.options.name];
        var def: ProxyConfiguration<SidecarMetadata>;
        if (typeof instanceConfig == 'undefined')
            def = this.config.containers[name];
        else
            def = this.config.containers[instanceConfig.container];

        // eslint-disable-next-line no-var
        var container = this.processes[context.options.name];
        if (container && container.running)
            throw new Error(container.name + ' is already started');

        args = [];

        if (!def && name != 'pm')
        {
            // require.resolve(name);
            throw new ErrorWithStatus(404, `No mapping was found for ${name}. Did you want to run \`pm install ${name}\` or maybe are you missing the folder to ${name} ?`)
        }

        args.unshift(...context.args, ...Object.entries(context.options).filter(e => e[0] != 'program' && e[0] != 'new' && e[0] != 'inspect').map(entries => ['--' + entries[0] + '=' + entries[1]]).flat());
        if (def && def.get('path'))
            args.unshift('--program=' + def.get('path'));
        else
            args.unshift('--program=' + name);
    }
    else
    {
        if (name != 'pm')
            throw new ErrorWithStatus(40, 'this command needs to run through daemon process');

        args = [...context.args, ...Object.entries(context.options).map(entries => ['--' + entries[0] + '=' + entries[1]]).flat()];
    }

    args.unshift(require.resolve('../fork'))

    if (context.options && context.options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (context.options && context.options.verbose)
        args.push('-v')

    const log = logger('akala:pm:' + context.options.name);
    let cp: ChildProcess;
    if (!this.isDaemon)
    {
        cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        cp.on('exit', function (...args: unknown[])
        {
            console.log(args);
        })
        cp.on('message', function (message)
        {
            console.log(message);
            cp.disconnect();
        });
        return new Promise<void>((resolve) =>
        {
            cp.on('disconnect', function ()
            {
                cp.unref();
                console.log('pm started');
                resolve();
            })
        })
    }
    else
    {
        if (!container && this.config.containers[name]?.dependencies?.length)
        {
            var missingDeps = def.dependencies.filter(d => !this.config.mapping[d]);
            if (missingDeps.length > 0)
                throw new ErrorWithStatus(404, `Some dependencies are missing to start ${context.options.name}:\n\t-${missingDeps.join('\n\t-')}`);

            await eachAsync(def.dependencies, (dep) => pm.dispatch('start', dep, { name: context.options.name + '-' + dep, wait: true }));
        }

        cp = spawn(process.execPath, args, { cwd: process.cwd(), env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        cp.stderr?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stderr);
        cp.stdout?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stdout);

        if (!container || !container.running)
        {
            const processor = new Processors.JsonRpc(new jsonrpc.Connection(new IpcAdapter(cp), {
                type: 'client', getHandler(method: string)
                {
                    log.debug(method);
                    return async function (params: jsonrpc.SerializableObject, reply)
                    {
                        log.debug(params);
                        try
                        {
                            if (!params)
                                params = { param: [] };
                            if (!params._trigger || params._trigger == 'proxy')
                                params._trigger = 'jsonrpc';
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            params.process = container as any;
                            const result = await pm.dispatch(method, params) as jsonrpc.PayloadDataType<void>;
                            log.debug(result);
                            reply(null, result);
                        }
                        catch (error)
                        {
                            log.debug(error);
                            reply(error);
                        }
                    }
                }
                , disconnected()
                {
                    console.warn(`${context.options.name} has disconnected`);
                    container.running = null;
                }
            }), true);

            if (container)
                container = new Container(context.options.name, null, processor) as RunningContainer;
            else
                container = new Container(context.options.name, null, processor) as RunningContainer;

            if (def?.commandable)
                pm.register(container);

            this.processes[context.options.name] = container;
        }
        container.process = cp;
        Object.assign(container, def, instanceConfig);
        container.ready = new jsonrpc.Deferred();
        if (container.commandable)
        {
            container.unregister(Cli.Metadata.name);
            container.register(Metadata.extractCommandMetadata(Cli.Metadata));
        }
        container.ready.then(() =>
        {
            return container.dispatch('$metadata').then((metaContainer: Metadata.Container) =>
            {
                // console.log(metaContainer);
                registerCommands(metaContainer.commands, null, container);
                pm.register(name, container, true);
            });

        })

        container.running = true;
        cp.on('exit', function ()
        {
            (container as RunningContainer).running = false;
            pm.unregister(container.name);
            container.ready.reject(new Error('program stopped'));
        });
        if (context.options.wait && container.commandable)
            await container.ready;
        return { execPath: process.execPath, args: args, cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false, windowsHide: true };
    }
}

start.$inject = ['$container', 'param.0', 'options']