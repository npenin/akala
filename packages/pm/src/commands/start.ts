import { Container, Processors, CommandProxy } from "@akala/commands";
import State, { RunningContainer } from "../state";
import { spawn, ChildProcess } from "child_process";
import { description } from "../container";
import * as jsonrpc from '@akala/json-rpc-ws'
import debug from "debug";

export default async function start(this: State, pm: description.pm & Container<State>, name: string, options?: any)
{
    if (this.isDaemon)
    {
        var container = this.processes.find(c => c.name == name);
        if (container && container.running)
            throw new Error(name + ' is already started');
        var args: string[] = await pm.dispatch('config', name);
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

    if (options && options.v)
        args.push('-v')

    const log = debug('akala:pm:' + name);

    if (!this.isDaemon)
    {
        var cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        cp.on('exit', function ()
        {
            console.log(arguments);
        })
        cp.on('message', function (message)
        {
            console.log(message);
            cp.disconnect();
        })
        return new Promise((resolve) =>
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
        var cp = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false, windowsHide: true });
        if (!container)
        {
            container = new Container(name, null, new Processors.JsonRpc(new jsonrpc.Connection(new IpcAdapter(cp), {
                type: 'client', browser: false, getHandler(method: string)
                {
                    return async function (params, reply)
                    {
                        try
                        {
                            var result = await (container as Container<void>).dispatch(method, Object.assign(params ?? { param: [] }, { _trigger: 'jsonrpc' }))
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
                }
            }))) as RunningContainer;
            container.path = name;
            this.processes.push(container);
        }
        container.process = cp;
        container.commandable = this.config.mapping[name].commandable;
        if (container.commandable)
            pm.register(name, container);
        container.resolve = function (c: string)
        {
            return new CommandProxy<any>((container as RunningContainer).processor, c) as any;
        }
        container.running = true;
        cp.on('exit', function ()
        {
            (container as RunningContainer).running = false;
        })
        return { execPath: process.execPath, args: args, cwd: process.cwd(), stdio: ['inherit', 'inherit', 'inherit', 'ipc'], shell: false, windowsHide: true };
    }
};

export class IpcAdapter implements jsonrpc.SocketAdapter
{
    get open() { return !!this.cp.pid };
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
    on(event: "message", handler: (this: any, ev: MessageEvent) => void): void;
    on(event: "open", handler: (this: any) => void): void;
    on(event: "error", handler: (this: any, ev: Event) => void): void;
    on(event: "close", handler: (this: any, ev: CloseEvent) => void): void;
    on(event: "message" | "open" | "error" | "close", handler: (ev?: any) => void): void
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
    once(event: "message", handler: (this: any, ev: MessageEvent) => void): void;
    once(event: "open", handler: (this: any) => void): void;
    once(event: "error", handler: (this: any, ev: Event) => void): void;
    once(event: "close", handler: (this: any, ev: CloseEvent) => void): void;
    once(event: "message" | "open" | "error" | "close", handler: (ev?: any) => void): void
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

exports.default.$inject = ['container', 'param.0', 'options']