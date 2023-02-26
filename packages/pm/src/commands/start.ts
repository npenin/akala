import { Container, Processors, Metadata, Cli, updateCommands } from "@akala/commands";
import State, { RunningContainer, SidecarMetadata } from '../state.js';
import { spawn, ChildProcess, StdioOptions } from "child_process";
import { MessagePort, Worker } from "worker_threads";
import pmContainer from '../container.js';
import * as jsonrpc from '@akala/json-rpc-ws'
import { eachAsync, logger } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { CliContext } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import getRandomName from "./name.js";
import { ProxyConfiguration } from "@akala/config";
import { IpcAdapter } from "../ipc-adapter.js";

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

    const log = logger('akala:pm:' + context.options.name);
    let cp: ChildProcess | Worker;
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
            (cp as ChildProcess).disconnect();
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

        // cp = spawn(process.execPath, args, { cwd: process.cwd(), env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        switch (def?.type)
        {
            default:
                throw new ErrorWithStatus(400, `container with type ${this.config.containers[name]?.type} are not yet supported`);
            case 'worker':
                cp = new Worker(args[0], { argv: args, stderr: true, stdout: true });
                break;
            case 'nodejs':
                cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: !context.options.keepAttached, env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
                break;
        }
        // cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: !context.options.keepAttached, env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        cp.stderr?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stderr);
        cp.stdout?.pipe(new NewLinePrefixer(context.options.name + ' ', { useColors: true })).pipe(process.stdout);

        if (!container || !container.running)
        {
            var adapter: jsonrpc.SocketAdapter;
            switch (def.type)
            {
                case 'worker':
                    adapter = new MessagePortAdapter(cp as Worker);
                    break;
                case 'nodejs':
                    adapter = new IpcAdapter(cp as ChildProcess);
                    break;
            }

            const connection = Processors.JsonRpc.getConnection(adapter, pm, (params) =>
            {
                params.process = cp;
                Object.defineProperty(params, 'connectionAsContainer', Object.assign({ value: container }));
            });
            const processor = new Processors.JsonRpc(connection, true);

            container = new Container(context.options.name, null) as RunningContainer;

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
        container.ready = new Deferred();
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

export class MessagePortAdapter implements jsonrpc.SocketAdapter
{
    private isOpen: boolean = true;

    get open(): boolean { return this.isOpen; }
    close(): void
    {
        if (this.cp instanceof Worker)
            this.cp.terminate();
        else
            this.cp.close();
    }
    send(data: string): void
    {
        this.cp.postMessage(data);
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.on('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.on('disconnect', handler);
                break;
        }
    }

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.once('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.once('close', () => handler(null));
                break;
        }
    }

    constructor(private cp: MessagePort | Worker)
    {
        cp.on('close', () => this.isOpen = false);
    }

    // _write(chunk: string | Buffer, encoding: string, callback: (error?: any) => void)
    // {
    //     // The underlying source only deals with strings.
    //     if (Buffer.isBuffer(chunk))
    //         chunk = chunk.toString('utf8');
    //     if (this.cp.send)
    //         this.cp.send(chunk + '\n', callback);
    //     else
    //         callback(new Error('there is no send method on this process'));
    // }

    // _read()
    // {
    // }
}

start.$inject = ['$container', 'param.0', 'options']