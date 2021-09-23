import { Container, Processors, Metadata, registerCommands, Cli } from "@akala/commands";
import State, { RunningContainer } from '../state';
import { spawn, ChildProcess, StdioOptions } from "child_process";
import pmContainer from '../container';
import * as jsonrpc from '@akala/json-rpc-ws'
import debug from "debug";
import { eachAsync } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { SocketAdapterEventMap } from "@akala/json-rpc-ws";
import { CliContext, ErrorWithStatus } from "@akala/cli";
import getRandomName from "./name";

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, options?: CliContext<{ new?: boolean, name: string, inspect?: boolean, verbose?: boolean, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    let args: string[];

    if (!options.options.name && options.options.new)
        options.options.name = getRandomName();
    else if (!options.options.name)
        options.options.name = name;

    if (this.isDaemon)
    {
        // eslint-disable-next-line no-var
        var container = this.processes.find(c => c.name == options.options.name);
        if (container && container.running)
            throw new Error(container.name + ' is already started');
        args = await pm.dispatch('config', name) as string[];
        if (args)
            args = args.slice(0)
        else
            args = [];

        if (!this.config.mapping[name] && name != 'pm')
        {
            require.resolve(name);
            // throw new ErrorWithStatus(44, `No mapping was found for ${name}. Did you want to run \`pm install ${name}\` or maybe are you missing the folder to ${name} ?`)
        }

        args.unshift(...options.args, ...Object.entries(options.options).filter(e => e[0] != 'program' && e[0] != 'new' && e[0] != 'inspect').map(entries => ['--' + entries[0] + '=' + entries[1]]).flat());
        if (this.config && this.config.mapping[name] && this.config.mapping[name].path)
            args.unshift('--program=' + this.config.mapping[name].path);
        else
            args.unshift('--program=' + name);
    }
    else
    {
        if (name != 'pm')
            throw new ErrorWithStatus(40, 'this command needs to run through daemon process');

        args = [...options.args, ...Object.entries(options.options).map(entries => ['--' + entries[0] + '=' + entries[1]]).flat()];
    }

    args.unshift(require.resolve('../fork'))

    if (options.options && options.options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (options.options && options.options.verbose)
        args.push('-v')

    const log = debug('akala:pm:' + options.options.name);
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
        if (!container && this.config.mapping[name]?.dependencies?.length)
            await eachAsync(this.config.mapping[name].dependencies, (dep) => pm.dispatch('start', dep, { wait: true }));

        cp = spawn(process.execPath, args, { cwd: process.cwd(), env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        cp.stderr?.pipe(new NewLinePrefixer(options.options.name + ' ', { useColors: true })).pipe(process.stderr);
        cp.stdout?.pipe(new NewLinePrefixer(options.options.name + ' ', { useColors: true })).pipe(process.stdout);

        if (!container || !container.running)
        {
            const processor = new Processors.JsonRpc(new jsonrpc.Connection(new IpcAdapter(cp), {
                type: 'client', getHandler(method: string)
                {
                    log(method);
                    return async function (params: jsonrpc.SerializableObject, reply)
                    {
                        log(params);
                        try
                        {
                            if (!params)
                                params = { param: [] };
                            if (!params._trigger || params._trigger == 'proxy')
                                params._trigger = 'jsonrpc';
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            params.process = container as any;
                            const result = await pm.dispatch(method, params) as jsonrpc.PayloadDataType<void>;
                            log(result);
                            reply(null, result);
                        }
                        catch (error)
                        {
                            log(error);
                            reply(error);
                        }
                    }
                }
                , disconnected()
                {
                    console.warn(`${options.options.name} has disconnected`);
                }
            }), true);

            if (container)
                this.processes.splice(this.processes.indexOf(container), 1, container = new Container(options.options.name, null, processor) as RunningContainer);
            else
                container = new Container(options.options.name, null, processor) as RunningContainer;

            if (this.config.mapping[name]?.commandable)
                pm.register(container);

            this.processes.push(container);
        }
        container.process = cp;
        container.path = name;
        container.commandable = this.config.mapping[name].commandable;
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
        });
        if (options.options.wait && container.commandable)
            await container.ready;
        return { execPath: process.execPath, args: args, cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false, windowsHide: true };
    }
}

export class IpcAdapter implements jsonrpc.SocketAdapter
{
    get open(): boolean { return !!this.cp.pid }
    close(): void
    {
        this.cp.disconnect();
    }
    send(data: string): void
    {
        if (this.cp.send)
            this.cp.send(data + '\n');
        else
            console.warn(`process ${this.cp.pid} does not support send over IPC`);
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
                this.cp.once('disconnect', () => handler(null));
                break;
        }
    }

    constructor(private cp: ChildProcess | NodeJS.Process)
    {
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