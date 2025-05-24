#!/usr/bin/env node
import sms from 'source-map-support'
sms.install();
import path from 'path'
import pmDef from '../container.js';
import { IpcAdapter } from "../ipc-adapter.js";
import { module as coreModule } from '@akala/core';
import { buildCliContextFromContext, CliContext, NamespaceMiddleware } from '@akala/cli';
import { Processors, ServeMetadata, Cli, registerCommands, SelfDefinedCommand, StructuredParameters, Container, serveMetadata, connectByPreference, Metadata, $metadata, protocolHandlers } from '@akala/commands';
import { pathToFileURL } from 'url';
import commands from '../container.js';
import fsHandler, { Stats } from '@akala/fs';
import { Triggers } from '@akala/commands';


export default async function run(program: string, name: string, c: CliContext<{ help: boolean, configFile: string, name?: string, args?: string[] }>, pmSocket?: string)
{
    let folderOrFile: Stats;
    if (!URL.canParse(program))
        program = pathToFileURL(program).toString();
    const fs = await fsHandler.process(new URL('./', program));
    folderOrFile = await fs.stat(program);
    if (folderOrFile.isFile && path.extname(program) === '.js')
        return import(program);

    const cliContainer = new Container(name, {});

    const result = await protocolHandlers.process(new URL(program), { signal: c.abort.signal, container: cliContainer }, {});
    cliContainer.processor.useMiddleware(20, result.processor);
    const metaContainer = await result.getMetadata();
    registerCommands(metaContainer.commands, result.processor, cliContainer);

    const isPm = name === 'pm' && program === new URL('../../../commands.json', import.meta.url).toString();
    const init = cliContainer.resolve('$init');
    const cli = await Triggers.cli.register(cliContainer, new NamespaceMiddleware(null));

    process.on('unhandledRejection', (x) =>
    {
        c.abort.abort(x)
        return false;
    });
    process.on('uncaughtException', (x) =>
    {
        c.abort.abort(x)
        return false;
    });
    process.on('SIGINT', () => c.abort.abort('SIGINT'));

    let pm: Container<unknown> & pmDef.container;
    let pmConnectInfo: ServeMetadata;

    if (!isPm)
    {
        //eslint-disable-next-line @typescript-eslint/no-var-requires
        const pmMeta = commands.meta;
        if (process.connected)
        {
            pm = new Container('pm', null, new Processors.JsonRpc(Processors.JsonRpc.getConnection(new IpcAdapter(process), cliContainer))) as Container<unknown> & pmDef.container;
            registerCommands(pmMeta.commands, null, pm);
        }
        else
        {
            if (pmSocket)
                pmConnectInfo = { [pmSocket]: {} };
            else
                pmConnectInfo = serveMetadata({ args: ['local'], options: { socketName: 'pm' } })
            const x = await connectByPreference(pmConnectInfo, { metadata: pmMeta, signal: c.abort.signal, container: cliContainer });
            // controller.signal.addEventListener('abort', () => x.processor)
            pm = x.container as Container<unknown> & pmDef.container;
            pm.processor.useMiddleware(20, x.processor);
            const connect = pm.resolve('connect');
            pm.unregister('connect');
            pm.register(new SelfDefinedCommand((name: string, param: StructuredParameters<unknown[]>) =>
            {
                if (name == 'pm')
                    return pmConnectInfo;
                return x.processor.handle(pm, connect, param).then(e => { throw e }, r => r);
            }, 'connect', [
                "param.0",
                "$param"
            ]));
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        pm.unregister(Cli.Metadata.name);
        pm.register(Metadata.extractCommandMetadata(Cli.Metadata));
    }
    else
        pm = cliContainer as pmDef.container & Container<unknown>;

    coreModule('@akala/pm').register('container', pm);

    cliContainer.register(new SelfDefinedCommand(async (connectionId: string) =>
    {
        if (!pmConnectInfo)
            pmConnectInfo = await pm.dispatch('connect', 'pm');
        var pm2 = await connectByPreference(pmConnectInfo, { metadata: await cliContainer.dispatch('$metadata'), container: cliContainer });
        pm2.container.processor.useMiddleware(20, pm2.processor);
        pm2.container.unregister($metadata.name);
        pm2.container.register($metadata);
        pm2.container.register(Metadata.extractCommandMetadata(pm.resolve('bridge')));
        if (!await pm2.container.dispatch('bridge', connectionId))
            throw new Error('connection could not be established');
    }, '$bridge', ['param.0']));

    if (init)
    {
        const subContext = buildCliContextFromContext(c, '$init', ...c.options.args);
        subContext.options = c.options;
        subContext.options.configFile = c.options.configFile + '#' + c.options.name
        await cli.process(subContext);
    }

    try
    {
        const serveArgs = await pm.dispatch('connect', c.options.name);
        // console.log(serveArgs)
        // serveArgs.signal = controller.signal;
        if (!serveArgs && (!('socketName' in c.options) || !c.options.socketName))
            c.options['socketName'] = c.options.name;
        await cliContainer.dispatch('$serve', serveArgs || c, c.abort.signal);
    }
    catch (e)
    {
        if (!e || e.statusCode !== 404)
            throw e;
        console.warn(e.message);
    }

    if (pm !== cliContainer)
        await pm.dispatch('ready')

    return new Promise(resolve => c.abort.signal.addEventListener('abort', resolve))
}
