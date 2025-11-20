import { Processors, Metadata, Container, Triggers, Cli, registerCommands, protocolHandlers, SelfDefinedCommand, type StructuredParameters, type ICommandProcessor, type HandlerResult } from '@akala/commands';
import { Readable } from 'stream';

import { type StateConfiguration } from './state.js';
import { type CliContext, NamespaceMiddleware } from '@akala/cli';
import { eachAsync, HttpStatusCode, logger } from '@akala/core';
import commands from './container.js';
import cliCommands from './cli-container.js';
import Configuration from '@akala/config';
import { IpcAdapter } from './ipc-adapter.js';
import { FSFileSystemProvider } from '@akala/fs';
import { containers, InitAkala } from '@akala/commands/akala';
import { JsonRpcSocketAdapter } from '@akala/json-rpc-ws';

const log = logger.use('akala:pm');

const tableChars = {
    'top': '─'
    , 'top-mid': '┬'
    , 'top-left': '┌'
    , 'top-right': '┐'
    , 'bottom': '─'
    , 'bottom-mid': '┴'
    , 'bottom-left': '└'
    , 'bottom-right': '┘'
    , 'left': '│'
    , 'left-mid': '├'
    , 'mid': '─'
    , 'mid-mid': '┼'
    , 'right': '│'
    , 'right-mid': '┤'
    , 'middle': '│'
}
const truncate = '…';

export const backChannelContainer = new Container('', {});
export const remotePm = new Container('proxy-pm', {}) as commands.container & Container<unknown>;

if (process.connected)
    protocolHandlers.useProtocol('ipc', async (url, options) =>
    {
        const connection = Processors.JsonRpc.getConnection(new JsonRpcSocketAdapter(new IpcAdapter(process)), options.container);

        return {
            processor: new Processors.JsonRpc(connection),
            getMetadata: () => new Promise<Metadata.Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
                typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
            ))
        };
    })

type CliOptions = { output: string, verbose: number, pmSock: string | number, tls: boolean, help: boolean };
export default async function (_config, program: NamespaceMiddleware<{ configFile: string, verbose: number }>)
{
    const cli = program.command('pm').state<{ pm?: StateConfiguration }>().options<CliOptions>({
        output: { aliases: ['o'], needsValue: true, doc: 'output as `table` if array otherwise falls back to standard node output' },
        verbose: { aliases: ['v'] }, tls: { doc: "enables tls connection to the `pmSock`" },
        pmSock: { aliases: ['pm-sock'], needsValue: true, doc: "path to the unix socket or destination in the form host:port" },
        help: { doc: "displays this help message" }
    });

    const pm = new Container('pm-cli', {});

    const root = new URL('../../', import.meta.url);
    const fs = new Processors.FileSystem(new FSFileSystemProvider(root, true));

    registerCommands(cliCommands.meta.commands, fs, pm);

    await pm.attach(Triggers.cli, cli);

    pm.processor.useMiddleware(1, new InitAkala(commands.meta.commands.find(c => c.name === '$init'), {}));
    containers.register('pm', pm);

    const metaContainer = commands.meta;
    let result: HandlerResult<ICommandProcessor>;

    cli.preAction(async c =>
    {
        if (!result)
        {
            let pmConnectInfo: URL;
            if (c.options.pmSock)
            {
                if (typeof (c.options.pmSock) == 'string')
                    result = await protocolHandlers.process(pmConnectInfo = new URL(c.options.pmSock), { signal: c.abort.signal, container: backChannelContainer }, {})
                else
                    result = await protocolHandlers.process(pmConnectInfo = new URL('jsonrpc+tcp://localhost:' + c.options.pmSock), { signal: c.abort.signal, container: backChannelContainer }, {})
            }
            else
            {
                let connectMapping = c.state?.pm?.mapping.pm?.connect;
                if (connectMapping)
                    if (connectMapping instanceof Configuration)
                        connectMapping = connectMapping.extract();
                if (connectMapping)
                    await eachAsync(connectMapping, async (config, connectionString) =>
                    {
                        if (result)
                            return;
                        try
                        {
                            log.verbose('trying to connect to ' + connectionString);
                            const url = pmConnectInfo = new URL(connectionString);
                            if (url.hostname == '0.0.0.0')
                                url.hostname = 'localhost';
                            result = await protocolHandlers.process(url, { signal: c.abort.signal, container: backChannelContainer }, {})
                        }
                        catch (e)
                        {
                            log.silly('failed to connect to ' + connectionString);
                            log.silly(e)
                            if (e.statusCode == HttpStatusCode.BadGateway || e.code == 'ENOENT' || e.code == 'ECONNREFUSED')
                                return;
                            log.error(e);
                            throw e;
                        }

                    })
            }
            if (result)
            {
                remotePm.processor.useMiddleware(20, result.processor);

                const remoteMeta = await result.getMetadata();

                registerCommands(remoteMeta.commands.filter(c => !['run', 'connect', Cli.Metadata.name].includes(c.name)), null, remotePm);
                remotePm.unregister(Cli.Metadata.name);
                remotePm.register(Metadata.extractCommandMetadata(Cli.Metadata));

                remotePm.register({ ...metaContainer.commands.find(c => c.name === 'run'), processor: fs });

                remotePm.register(new SelfDefinedCommand((name: string, param: StructuredParameters<unknown[]>) =>
                {
                    if (name == 'pm')
                        return { [pmConnectInfo.toString()]: {} };
                    return result.processor.handle(pm, metaContainer.commands.find(c => c.name === 'connect'), param).then(e => { throw e }, r => r);
                }, 'connect', [
                    "param.0",
                    "$param"
                ]));

                await remotePm.attach(Triggers.cli, cli);
            }
        }
    })

    cli.format(async (result, context) =>
    {
        if (result instanceof Readable)
        {
            result.pipe(process.stdout);
            return new Promise((resolve) => result.on('close', resolve));
        }

        return formatResult(result, context.options.output, context);
    });
}

function formatResult(result: unknown, outputFormat: string, context: CliContext)
{
    if (!context.options.$repl)
        context.abort.abort();

    if (typeof result == 'undefined')
        return;

    switch (outputFormat)
    {
        case 'table':
            {
                const columnNames: string[] = [];
                const columns: { [key: string]: { maxWidthContent: number, maxWidth: number, values: string[] } } = {};
                if (Array.isArray(result))
                {
                    for (const r of result)
                    {
                        Object.keys(r).forEach(k =>
                        {
                            if (columnNames.indexOf(k) == -1)
                                columnNames.push(k);
                        })
                    }

                    columnNames.forEach(c =>
                    {
                        columns[c] = { maxWidthContent: 0, maxWidth: c.length + 2, values: [] };

                        for (const r of result)
                        {
                            if (typeof (r[c]) == 'undefined' || typeof r[c] == 'string' && r[c].length == 0)
                                columns[c].values.push('');
                            else if (r[c] == null)
                            {
                                columns[c].values.push('-');
                                columns[c].maxWidthContent = Math.max(columns[c].maxWidthContent, 1);
                            }
                            else
                            {
                                columns[c].values.push(r[c].toString());
                                columns[c].maxWidthContent = Math.max(columns[c].maxWidthContent, r[c].toString().length);
                            }
                            columns[c].maxWidth = Math.max(columns[c].maxWidthContent, columns[c].maxWidth);
                        }
                    });

                    let columnNamesForDisplay = columnNames.slice(0);
                    let width = columnNamesForDisplay.reduce((length, c, i) => columns[columnNames[i]].maxWidth + length, 0) + columnNamesForDisplay.length + 1
                    if (process.stdout.columns < width)
                    {
                        for (const c of columnNames)
                        {
                            if (columns[c].maxWidthContent == 0)
                                columnNamesForDisplay = columnNamesForDisplay.splice(columnNamesForDisplay.indexOf(c), 1)
                        }
                        width = columnNamesForDisplay.reduce((length, c, i) => columns[columnNames[i]].maxWidth + length, 0) + columnNamesForDisplay.length + 1
                    }
                    if (process.stdout.columns < width)
                    {
                        columnNamesForDisplay = columnNamesForDisplay.map(c =>
                        {
                            if (c.length > 8 + truncate.length)
                            {
                                const newName = c.substring(0, 8) + truncate;
                                columns[c].maxWidth = Math.max(columns[c].maxWidthContent, newName.length);
                                return newName;
                            }

                            return c;
                        })
                        width = columnNamesForDisplay.reduce((length, c, i) => columns[columnNames[i]].maxWidth + length, 0) + columnNamesForDisplay.length + 1
                    }
                    if (process.stdout.columns < width)
                    {
                        columnNamesForDisplay.forEach(c =>
                        {
                            columns[c].maxWidth = Math.max(columns[c].maxWidthContent, c.length);
                        })
                        width = columnNamesForDisplay.reduce((length, c, i) => columns[columnNames[i]].maxWidth + length, 0) + columnNamesForDisplay.length + 1
                    }
                    if (process.stdout.columns >= width)
                    {
                        process.stdout.write(tableChars["top-left"]);
                        columnNamesForDisplay.forEach((c, i) =>
                        {
                            for (let j = 0; j < columns[columnNames[i]].maxWidth; j++)
                                process.stdout.write(tableChars["top"]);

                            if (i == columnNames.length - 1)
                                process.stdout.write(tableChars["top-right"]);
                            else
                                process.stdout.write(tableChars["top-mid"]);
                        })

                        process.stdout.write('\n');
                        process.stdout.write(tableChars["left"]);

                        columnNamesForDisplay.forEach((c, i) =>
                        {
                            let pad: number;
                            for (pad = 0; pad < (columns[columnNames[i]].maxWidth - c.length) / 2; pad++)
                                process.stdout.write(' ');
                            process.stdout.write(c);
                            for (pad += c.length; pad < columns[columnNames[i]].maxWidth; pad++)
                                process.stdout.write(' ');

                            if (i == columnNames.length - 1)
                                process.stdout.write(tableChars["right"]);
                            else
                                process.stdout.write(tableChars["middle"]);
                        })
                        process.stdout.write('\n');

                        process.stdout.write(tableChars["left-mid"]);

                        columnNamesForDisplay.forEach((c, i) =>
                        {
                            for (let j = 0; j < columns[columnNames[i]].maxWidth; j++)
                                process.stdout.write(tableChars["mid"]);

                            if (i == columnNames.length - 1)
                                process.stdout.write(tableChars["right-mid"]);
                            else
                                process.stdout.write(tableChars["mid-mid"]);
                        })
                        process.stdout.write('\n');
                        for (let r = 0; r < result.length; r++)
                        {
                            process.stdout.write(tableChars["left"]);
                            columnNamesForDisplay.forEach((c, i) =>
                            {
                                const value = columns[columnNames[i]].values[r];
                                let pad: number;
                                for (pad = 0; pad < Math.floor((columns[columnNames[i]].maxWidth - value.length) / 2); pad++)
                                    process.stdout.write(' ');
                                process.stdout.write(value);
                                for (pad += value.length; pad < columns[columnNames[i]].maxWidth; pad++)
                                    process.stdout.write(' ');

                                if (i == columnNames.length - 1)
                                    process.stdout.write(tableChars["right"]);
                                else
                                    process.stdout.write(tableChars["middle"]);
                            })
                            process.stdout.write('\n');
                        }
                        process.stdout.write(tableChars["bottom-left"]);
                        columnNamesForDisplay.forEach((c, i) =>
                        {
                            for (let j = 0; j < columns[columnNames[i]].maxWidth; j++)
                                process.stdout.write(tableChars["bottom"]);

                            if (i == columnNames.length - 1)
                                process.stdout.write(tableChars["bottom-right"]);
                            else
                                process.stdout.write(tableChars["bottom-mid"]);
                        })
                        process.stdout.write('\n');
                        return;
                    }
                }
            }
        // eslint-disable-next-line no-fallthrough
        default:

            console.log(result);
            break;
    }
}
