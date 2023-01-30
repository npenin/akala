import { Container, Processors, Metadata, Cli, updateCommands } from "@akala/commands";
import State, { RunningContainer, SidecarMetadata } from '../state';
import { spawn, ChildProcess, StdioOptions } from "child_process";
import pmContainer from '../container';
import * as jsonrpc from '@akala/json-rpc-ws'
import { eachAsync } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { CliContext } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import getRandomName from "./name";
import { ProxyConfiguration } from "@akala/config";
import { IpcAdapter } from "../ipc-adapter";

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, context?: CliContext<{ new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
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

        args = [...context.args, ...Object.entries(context.options).filter(p => ['inspect'].indexOf(p[0]) == -1).map(entries => ['--' + entries[0] + '=' + entries[1]]).flat()];
    }

    if (!def?.type || def.type == 'nodejs')
        args.unshift(require.resolve('../fork'))

    if (context.options && context.options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (context.options && context.options.verbose)
        args.push('-v')

    let cp: ChildProcess;
    if (!this.isDaemon)
    {
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
    else
    {
        if (!container && def.dependencies?.length)
        {
            var missingDeps = def.dependencies.filter(d => !this.config.mapping[d]);
            if (missingDeps.length > 0)
                throw new ErrorWithStatus(404, `Some dependencies are missing to start ${context.options.name}:\n\t-${missingDeps.join('\n\t-')}`);

            await eachAsync(def.dependencies, (dep) => pm.dispatch('start', dep, { name: context.options.name + '-' + dep, wait: true }));
        }

        if (def?.type && def.type !== 'nodejs')
            throw new ErrorWithStatus(400, `container with type ${this.config.containers[name]?.type} are not yet supported`);
        cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: !context.options.keepAttached, env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        cp.stderr?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stderr);
        cp.stdout?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stdout);

        if (!container || !container.running)
        {
            const socket = new IpcAdapter(cp);
            container = new Container(context.options.name, null) as RunningContainer;
            const connection = Processors.JsonRpc.getConnection(socket, pm, (params) =>
            {
                params.process = cp;
                Object.defineProperty(params, 'connectionAsContainer', Object.assign({ value: container }));
            });
            container.processor.useMiddleware(20, new Processors.JsonRpc(connection, true));

            connection.on('close', function disconnected()
            {
                console.warn(`${context.options.name} has disconnected`);
                container.running = false;
            });

            if (def?.commandable)
                pm.register(container, def?.stateless);

            this.processes[context.options.name] = container;
        }
        container.process = cp;

        Object.assign(container, def, instanceConfig);
        container.ready = new jsonrpc.Deferred();
        if (container.commandable)// && !container.stateless)
        {
            container.unregister(Cli.Metadata.name);
            container.register(Metadata.extractCommandMetadata(Cli.Metadata));
        }
        container.ready.then(() =>
        {
            return container.dispatch('$metadata').then((metaContainer: Metadata.Container) =>
            {
                // console.log(metaContainer);
                updateCommands(metaContainer.commands, null, container);
                pm.register(name, container, true);
            });
        }, () =>
        {
            console.warn(`${context.options.name} has disconnected`);
            container.running = false;
        });

        container.running = true;
        let buffer = [];
        cp.on('exit', function ()
        {
            (container as RunningContainer).running = false;
            if (!container.stateless)
            {
                pm.unregister(container.name);
                container.ready.reject(new Error('program stopped: ' + buffer?.join('')));
            }
        });
        if (context.options.wait && container.commandable)
        {
            function gather(chunk: string)
            {
                buffer.push(chunk);
            }
            cp.stderr.on('data', gather);
            await container.ready.finally(() =>
            {
                buffer = null;
                cp.stderr.off('data', gather);
            });
        }
        return { execPath: process.execPath, args: args, cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false, windowsHide: true };
    }
}

start.$inject = ['$container', 'param.0', 'options']