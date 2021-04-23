import { Container, Processors, Metadata, registerCommands } from "@akala/commands";
import State, { RunningContainer } from "../state";
import { spawn, ChildProcess, StdioOptions } from "child_process";
import pmContainer from "../container";
import * as jsonrpc from '@akala/json-rpc-ws'
import debug from "debug";
import { eachAsync } from "@akala/core";
import { NewLinePrefixer } from "../new-line-prefixer";
import { SocketAdapterEventMap } from "@akala/json-rpc-ws/src/shared-connection";

export default async function start(this: State, pm: pmContainer & Container<State>, name: string, options?: { inspect?: boolean, verbose?: boolean, wait?: boolean }): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    let args: string[];
    if (this.isDaemon)
    {
        // eslint-disable-next-line no-var
        var container = this.processes.find(c => c.name == name);
        if (container && container.running)
            throw new Error(name + ' is already started');
        args = await pm.dispatch('config', name) as string[];
        if (args)
            args = args.slice(0)
        else
            args = [];

        if (!this.config.mapping[name] && name != 'pm')
            throw new Error(`No mapping was found for ${name}. Did you want to run \`pm install ${name}\` or maybe are you missing the folder to ${name} ?`)

        if (this.config && this.config.mapping[name] && this.config.mapping[name].path)
            args.unshift(this.config.mapping[name].path);
        else
            args.unshift(name);
    }
    else
    {
        if (name != 'pm')
            throw new Error('this command needs to run through daemon process');

        args = [name];
    }

    args.unshift(require.resolve('../fork'))

    if (options && options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (options && options.verbose)
        args.push('-v')

    const log = debug('akala:pm:' + name);
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
        })
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
        if (!container && this.config.mapping[name].dependencies?.length)
        {
            await eachAsync(this.config.mapping[name].dependencies, async function (dep)
            {
                await pm.dispatch('start', dep, { wait: true });

            })
        }

        cp = spawn(process.execPath, args, { cwd: process.cwd(), env: Object.assign({ DEBUG_COLORS: true }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        cp.stderr?.pipe(new NewLinePrefixer(name + ' ', { useColors: true })).pipe(process.stderr);
        cp.stdout?.pipe(new NewLinePrefixer(name + ' ', { useColors: true })).pipe(process.stdout);

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
                    console.warn(`${name} has disconnected`);
                }
            }), true);

            if (container)
                this.processes.splice(this.processes.indexOf(container), 1, container = new Container(name, null, processor) as RunningContainer);
            else
                container = new Container(name, null, processor) as RunningContainer;

            if (this.config.mapping[name].commandable)
            {
                container.dispatch('$metadata').then((metaContainer: Metadata.Container) =>
                {
                    // console.log(metaContainer);
                    registerCommands(metaContainer.commands, processor, container as Container<unknown>);
                    pm.register(name, container, true);
                });
                pm.register(container);
            }
            this.processes.push(container);
        }
        container.process = cp;
        container.path = name;
        container.commandable = this.config.mapping[name].commandable;
        container.ready = new jsonrpc.Deferred();

        this.config.mapping[name]
        // container.resolve = function (c: string)
        // {
        //     return new CommandProxy<any>((container as RunningContainer).processor, c, ['$param']) as any;
        // }
        container.running = true;
        cp.on('exit', function ()
        {
            (container as RunningContainer).running = false;
        });
        if (options.wait && container.commandable)
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
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev?: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.on('message', handler);
                break;
            case 'open':
                handler();
                break;
            case 'close':
                this.cp.on('disconnect', handler);
                break;
        }
    }

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev?: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.once('message', handler);
                break;
            case 'open':
                handler();
                break;
            case 'close':
                this.cp.once('disconnect', handler);
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

exports.default.$inject = ['$container', 'param.0', 'options']