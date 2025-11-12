#!/usr/bin/env node
import path from 'path'
import pmDef from '../container.js';
import { module as coreModule } from '@akala/core';
import { buildCliContextFromContext, type CliContext, NamespaceMiddleware } from '@akala/cli';
import { type ServeMetadata, registerCommands, SelfDefinedCommand, Container, connectByPreference, Metadata, $metadata, protocolHandlers } from '@akala/commands';
import { pathToFileURL } from 'url';
import fsHandler, { type Stats } from '@akala/fs';
import { Triggers } from '@akala/commands';
import { backChannelContainer, remotePm } from '../akala.mjs';

export default async function run(program: string, name: string, c: CliContext<{ help: boolean, configFile: string, name?: string, args?: string[] }>, pmSocket?: string)
{
    let folderOrFile: Stats;
    if (!URL.canParse(program))
        program = pathToFileURL(program).toString();
    const fs = await fsHandler.process(new URL('./', program));
    folderOrFile = await fs.stat(program);
    if (folderOrFile.isFile && path.extname(program) === '.js')
        return import(program);

    const cliContainer = backChannelContainer

    const result = await protocolHandlers.process(new URL(program), { signal: c.abort.signal, container: cliContainer }, {});
    cliContainer.processor.useMiddleware(20, result.processor);
    const metaContainer = await result.getMetadata();
    registerCommands(metaContainer.commands, result.processor, cliContainer);
    cliContainer.name = name;

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
    process.on('SIGINT', () => { c.abort.abort('SIGINT') });

    let pm: Container<unknown> & pmDef.container;
    let pmConnectInfo: ServeMetadata;

    if (!isPm)
    {
        pm = remotePm;
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
    }, '$bridge', ['params.0']));

    if (init)
    {
        const subContext = buildCliContextFromContext(c, '$init', ...c.options.args);
        subContext.options = { ...c.options };
        subContext.options.configFile = c.options.configFile + '#' + c.options.name;
        subContext.state = c.state[c.options.name];
        if (!subContext.state)
        {
            c.state[c.options.name] = {};
            subContext.state = c.state[c.options.name];
        }

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
    else
        await pm.dispatch('ready', { _trigger: 'pm', params: [pm] })


    return new Promise(resolve => c.abort.signal.addEventListener('abort', resolve))
}
