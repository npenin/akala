import { Container, Processors, CommandProxy } from "@akala/commands";
import State, { RunningContainer } from "../state";
import { spawn, ChildProcess } from "child_process";
import { description } from "../container";
import unparse from 'yargs-unparser';
import { TransformOptions, Duplex } from "stream";

export default async function start(this: State, pm: description.pm & Container<State>, name: string, options?: any)
{
    if (false && name == 'pm')
    {
        options._.shift();
        let args = unparse(options);
        args.unshift(require.resolve('../fork'));

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
            container = new Container(name, null, new Processors.JsonRPC(new IpcStream(cp, { encoding: 'utf8' }))) as RunningContainer;
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

class IpcStream extends Duplex
{
    constructor(private cp: ChildProcess, options?: TransformOptions)
    {
        super(options);
        this.cp.on('message', (message) =>
        {
            this.push(message + '\n');
        })

    }

    _write(chunk: string | Buffer, encoding: string, callback: () => void)
    {
        // The underlying source only deals with strings.
        if (Buffer.isBuffer(chunk))
            chunk = chunk.toString(encoding);
        this.cp.send(chunk + '\n', callback);
    }

    _read()
    {
    }
}

exports.default.$inject = ['container', 'param.0', 'options']