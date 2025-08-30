import { Container, Processors, Metadata, Cli, updateCommands } from "@akala/commands";
import type { RunningContainer, SidecarMetadata } from '../state.js';
import type State from '../state.js';
import pmContainer from '../container.js';
import { eachAsync, Event, ErrorWithStatus, sequencify, HttpStatusCode } from "@akala/core";
import { type CliContext, unparseOptions } from "@akala/cli";
import getRandomName from "./name.js";
import { type ProxyConfiguration, unwrap } from "@akala/config";
import path from 'path'
import { fileURLToPath } from 'url'
import { RuntimeEventMap, type RuntimeInstance } from "../runtimes/shared.js";
import ChildProcess from "../runtimes/child_process.js";
import Worker from "../runtimes/worker.js";
import Docker from "../runtimes/docker.js";


//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default async function start(this: State, pm: pmContainer.container & Container<State>, name: string, options?: CliContext<{ configFile?: string, new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: number, wait?: boolean, autostart?: boolean }>['options'], context?: Pick<CliContext<{}>, 'args'>): Promise<void | { execPath: string, args: string[], cwd: string, shell: boolean, windowsHide: boolean }>
{
    let args: string[];
    if (options)
        if (!options.name && options.new)
            options.name = getRandomName();
        else if (!options.name)
            options.name = name;

    if (options && !options.configFile)
        options.configFile = this.config[unwrap].path.toString();

    let def: ProxyConfiguration<SidecarMetadata>;

    var instanceConfig = this.config.mapping[options.name || name];
    if (!instanceConfig?.container)
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

    var container = this.processes[options.name || name];
    if (container?.running)
        throw new ErrorWithStatus(HttpStatusCode.Conflict, container.name + ' is already started');

    args = [];

    if (!def && name != 'pm')
        throw new ErrorWithStatus(404, `No mapping was found for ${name}. Did you want to run \`pm install ${name}\` or maybe are you missing the folder to ${name} ?`)

    // if (options.configFile)
    //     options.configFile += '#' + options.name

    args.unshift(...(context?.args || []), ...unparseOptions({ ...options, program: undefined, new: undefined, inspect: undefined }, { ignoreUndefined: true }));
    if (def && def.get('path'))
        args.unshift('--program=' + def.get('path'));
    else
        args.unshift('--program=' + name);

    if (options?.inspect)
        args.unshift('--inspect-brk');

    args.unshift(...process.execArgv);

    if (options?.verbose)
        args.push('-v')


    let cp: RuntimeInstance;

    if (!container && def.dependencies?.length)
    {
        const missingDeps = def.dependencies.filter(d => !this.config.containers[d] && !this.config.mapping[d]);
        if (missingDeps.length > 0)
            throw new ErrorWithStatus(404, `Some dependencies are missing to start ${options.name}:\n\t-${missingDeps.join('\n\t-')}`);

        const seq = sequencify({ ...Object.fromEntries(Object.entries(this.config.containers.extract()).map(e => [e[0], { dep: e[1].dependencies || [] }])), [name]: { dep: def.dependencies } }, [name])
        if (seq.missingTasks?.length || seq.recursiveDependencies?.length)
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, 'Some dependencies are not satisfied by the current process. Please check your dependencies and try again.\n' + JSON.stringify(seq))

        await eachAsync(seq.sequence, async (dep) =>
        {
            if (dep === name)
                return;
            if (!this.processes[dep])
            {
                try
                {
                    await pm.dispatch('start', dep, { wait: true })
                }
                catch (e)
                {
                    if (e.statusCode !== HttpStatusCode.Conflict)
                        throw e;
                    await new Promise(resolve => this.processes[dep].ready?.addListener(resolve, { once: true }));
                }
            }
            else
                await new Promise(resolve => this.processes[dep].ready?.addListener(resolve, { once: true }));
        });
    }

    switch (def?.type)
    {
        case 'worker':
            cp = await Worker.build(args, options);
            break;
        case 'docker':
            cp = await Docker.build(args, options);
        case 'nodejs':
            args.push('--pm-sock', 'ipc://')
            cp = await ChildProcess.build(args, { ...options, keepAttached: true }) as RuntimeInstance<RuntimeEventMap>;
            break;
        default:
            throw new ErrorWithStatus(400, `container with type ${this.config.containers[name]?.type} are not yet supported`);
    }

    if (!container?.running)
    {
        container = new Container(options.name, null) as RunningContainer;
        const connection = Processors.JsonRpc.getConnection(cp.adapter, pm, (params) =>
        {
            params.process = cp;
            Object.defineProperty(params, 'connectionAsContainer', { value: container });
        });
        container.processor.useMiddleware(20, new Processors.JsonRpc(connection));

        connection.on('close', function disconnected()
        {
            console.warn(`${options.name} has disconnected`);
            container.running = false;
        });

        this.processes[options.name] = container;
    }
    container.process = cp;

    Object.assign(container, def, instanceConfig);
    container.ready = new Event();
    if (container.commandable)// && !container.stateless)
    {
        container.unregister(Cli.Metadata.name);
        container.register(Metadata.extractCommandMetadata(Cli.Metadata));

        container.ready.addListener(() =>
        {
            return container.dispatch('$metadata').then((metaContainer: Metadata.Container) =>
            {
                updateCommands(metaContainer.commands, null, container);
                container.stateless = metaContainer.stateless;
                pm.register(name, container, true);
            });
        });
    }
    // , () =>
    // {
    //     console.warn(`${options.name} has disconnected`);
    //     container.running = false;
    // });

    container.running = true;
    let buffer = [];

    if (options.wait && container.commandable)
    {
        //eslint-disable-next-line no-inner-declarations
        function gather(chunk: string)
        {
            buffer.push(chunk);
        }
        cp.stderr.on('data', gather);
        cp.on('exit', (code, signal) =>
        {
            cp.stderr.off('data', gather);

            if ((signal || code) && buffer?.length > 0)
                console.error(new Error('program stopped: ' + buffer.join('')));
            buffer = null;
        })
    }

    cp.on('exit', function ()
    {
        container.running = false;
        pm.unregister(container.name);
    });

    if (options.wait)
        await new Promise<void>(resolve => container.ready?.addListener(resolve));
    return { execPath: process.execPath, args: args, cwd: process.cwd(), shell: false, windowsHide: true };
}
