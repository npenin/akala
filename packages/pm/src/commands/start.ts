import { Container, Processors, Metadata, Cli, updateCommands } from "@akala/commands";
import State, { RunningContainer, SidecarMetadata } from '../state.js';
import pmContainer from '../container.js';
import { eachAsync, Event } from "@akala/core";
import { CliContext, unparseOptions } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import getRandomName from "./name.js";
import { ProxyConfiguration } from "@akala/config";
import path from 'path'
import { fileURLToPath } from 'url'
import { RuntimeInstance } from "../runtimes/shared.js";
import ChildProcess from "../runtimes/child_process.js";
import Worker from "../runtimes/worker.js";

//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, options?: CliContext<{ configFile?: string, new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean, autostart?: boolean }>['options'], context?: Pick<CliContext<{}>, 'args'>): Promise<void | { execPath: string, args: string[], cwd: string, shell: boolean, windowsHide: boolean }>
{
    let args: string[];
    if (options)
        if (!options.name && options.new)
            options.name = getRandomName();
        else if (!options.name)
            options.name = name;

    if (this.isDaemon)
    {
        var instanceConfig = this.config.mapping[options.name || name];
        var def: ProxyConfiguration<SidecarMetadata>;
        if (typeof instanceConfig == 'undefined' || !instanceConfig.container)
            def = this.config.containers[name];
        else
            def = this.config.containers[instanceConfig.container];

        if (typeof options.autostart !== 'undefined')
            if (instanceConfig)
                instanceConfig.autostart = options.autostart;
            else
            {
                this.config.mapping.set(options.name || name, { container: name, autostart: options.autostart });
                await this.config.commit()
            }

        // eslint-disable-next-line no-var
        var container = this.processes[options.name || name];
        if (container && container.running)
            throw new Error(container.name + ' is already started');

        args = [];

        if (!def && name != 'pm')
        {
            // require.resolve(name);
            throw new ErrorWithStatus(404, `No mapping was found for ${name}. Did you want to run \`pm install ${name}\` or maybe are you missing the folder to ${name} ?`)
        }

        if (options.configFile)
            options.configFile += '#' + options.name

        args.unshift(...(context?.args || []), ...unparseOptions({ ...options, program: undefined, new: undefined, inspect: undefined }, { ignoreUndefined: true }));
        if (def && def.get('path'))
            args.unshift('--program=' + def.get('path'));
        else
            args.unshift('--program=' + name);
    }
    else
    {
        if (name != 'pm')
            throw new ErrorWithStatus(40, 'this command needs to run through daemon process');

        args = [new URL('../../../commands.json', import.meta.url).toString(), ...(context?.args || []), ...unparseOptions({ ...options, inspect: undefined })];
    }

    if (!def?.type || def.type == 'nodejs')
    {

        args.unshift(path.resolve(_dirname, '../fork'))
    }

    if (options && options.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (options && options.verbose)
        args.push('-v')

    if (!this.isDaemon)
    {
        const cp = ChildProcess.build(args, { inheritStdio: true, name: options.name });
        cp.on('exit', function ()
        {
            console.log(args);
        })

        return new Promise<void>((resolve) =>
        {
            cp.on('runningChanged', () =>
            {
                if (!options.keepAttached)
                    cp.unref();
                console.log('pm started');
                resolve();
            })
        })
    }
    else
    {
        let cp: RuntimeInstance;

        if (!container && def.dependencies?.length)
        {
            var missingDeps = def.dependencies.filter(d => !this.config.containers[d] && !this.config.mapping[d]);
            if (missingDeps.length > 0)
                throw new ErrorWithStatus(404, `Some dependencies are missing to start ${options.name}:\n\t-${missingDeps.join('\n\t-')}`);

            await eachAsync(def.dependencies, async (dep) => { await pm.dispatch('start', dep, { name: options.name + '-' + dep, wait: true }) });
        }

        switch (def?.type)
        {
            case 'worker':
                cp = Worker.build(args, options);
                break;
            case 'nodejs':
                cp = ChildProcess.build(args, options);
                break;
            default:
                throw new ErrorWithStatus(400, `container with type ${this.config.containers[name]?.type} are not yet supported`);
        }

        if (!container || !container.running)
        {
            container = new Container(options.name, null) as RunningContainer;
            const connection = Processors.JsonRpc.getConnection(cp.adapter, pm, (params) =>
            {
                params.process = cp;
                Object.defineProperty(params, 'connectionAsContainer', Object.assign({ value: container }));
            });
            container.processor.useMiddleware(20, new Processors.JsonRpc(connection));

            connection.on('close', function disconnected()
            {
                console.warn(`${options.name} has disconnected`);
                container.running = false;
            });

            if (def?.commandable)
                pm.register(container, def?.stateless);

            this.processes[options.name] = container;
        }
        container.process = cp;

        Object.assign(container, def, instanceConfig);
        container.ready = new Event();
        if (container.commandable)// && !container.stateless)
        {
            container.unregister(Cli.Metadata.name);
            container.register(Metadata.extractCommandMetadata(Cli.Metadata));
        }
        container.ready.addListener(() =>
        {
            return container.dispatch('$metadata').then((metaContainer: Metadata.Container) =>
            {
                // console.log(metaContainer);
                updateCommands(metaContainer.commands, null, container);
                container.stateless = metaContainer.stateless;
                pm.register(name, container, true);
            });
        });
        // , () =>
        // {
        //     console.warn(`${options.name} has disconnected`);
        //     container.running = false;
        // });

        container.running = true;
        let buffer = [];

        cp.on('exit', function ()
        {
            (container as RunningContainer).running = false;
            if (!container.stateless)
            {
                pm.unregister(container.name);
                console.log(new Error('program stopped: ' + buffer?.join('')));
            }
        });
        if (options.wait && container.commandable)
        {
            //eslint-disable-next-line no-inner-declarations
            function gather(chunk: string)
            {
                buffer.push(chunk);
            }
            cp.stderr.on('data', gather);
            cp.on('exit', () =>
            {
                buffer = null;
                cp.stderr.off('data', gather);
            });
        }
        if (options.wait)
            await new Promise<void>(resolve => container.ready?.addListener(resolve));
        return { execPath: process.execPath, args: args, cwd: process.cwd(), shell: false, windowsHide: true };
    }
}
