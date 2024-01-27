#!/usr/bin/env node
import * as path from 'path'
import { Processors, NetSocketAdapter, Metadata, Container, proxy, Triggers, Cli } from '@akala/commands';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { platform, homedir } from 'os';
import start from './cli-commands/start-self.js'
import { Readable } from 'stream';

import State, { StateConfiguration } from './state.js';
import { program, buildCliContextFromProcess, ErrorMessage, supportInteract } from '@akala/cli';
import { InteractError } from './index.js';
import { Binding } from '@akala/core';
import { open } from 'fs/promises';

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

type CliOptions = { output: string, verbose: boolean, pmSock: string | number, tls: boolean, help: boolean };

const cli = program.options<CliOptions>({ output: { aliases: ['o'], needsValue: true, doc: 'output as `table` if array otherwise falls back to standard node output' }, verbose: { aliases: ['v'] }, tls: { doc: "enables tls connection to the `pmSock`" }, pmSock: { aliases: ['pm-sock'], needsValue: true, doc: "path to the unix socket or destination in the form host:port" }, help: { doc: "displays this help message" } });
cli.command('start pm')
    .option('inspect', { doc: "starts the process with --inspect-brk parameter to help debugging" })
    .option('keepAttached', { doc: "keeps the process attached" })
    .action(c =>
    {
        c.options['name'] = 'pm'
        c.options['program'] = new URL('../../commands.json', import.meta.url).toString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return start.call({} as unknown as State, null, 'pm', c as any);
    });

let socket: Socket;
let processor: Processors.JsonRpc;
let metaContainer: Metadata.Container;
let container: Container<unknown>;

cli.preAction(async c =>
{
    process.stdin.pause();
    process.stdin.setEncoding('utf8');
    if (!socket)
    {
        const netsocket = socket = new Socket();
        if (c.options.tls)
        {
            socket = new TLSSocket(netsocket, {});
        }

        await new Promise<void>((resolve, reject) =>
        {
            if (c.options.pmSock)
            {
                if (typeof (c.options.pmSock) == 'string')
                {
                    const indexOfColon = c.options.pmSock.indexOf(':');
                    if (indexOfColon > -1)
                        netsocket.connect(Number(c.options.pmSock.substring(indexOfColon + 1)), c.options.pmSock.substring(0, indexOfColon));
                    else
                        netsocket.connect(c.options.pmSock);
                }
                else
                    netsocket.connect(c.options.pmSock as number);
            }
            else if (platform() == 'win32')
                netsocket.connect('\\\\?\\pipe\\pm')
            else
            {
                open('./.pm.config.json').then(d =>
                {
                    d.readFile({ encoding: 'utf-8' }).then(d => JSON.parse(d)).then((config: StateConfiguration) =>
                    {
                        netsocket.connect(config.mapping.pm.connect.socket[0]);
                    }).finally(() => d.close());
                }, e =>
                {
                    if (e.code === 'ENOENT' && e.path === './.pm.config.json')
                        socket.destroy(e);
                    else
                    {
                        reject(e);
                        throw e;
                    }
                });
            }

            if (c.options.tls)
            {
                // socket.on('data', function (e) { console.log(e) });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                socket.connect({} as any);
                netsocket.on('error', function (e)
                {
                    console.log(e);
                });
                socket.on('error', function (e)
                {
                    console.log(e);
                });
            }
            socket.on('connect', async function ()
            {
                resolve();
                socket.setEncoding('utf-8');
            });
            socket.on('error', async (e: Error & { code?: string }) =>
            {
                if (c.options.help)
                    resolve();
                else
                {
                    if (e.code === 'ENOENT')
                    {
                        // return tryLocalProcessing(c).catch(() =>
                        // {
                        resolve();
                        // reject(new Error('pm is not started'));
                        // });
                    }
                    else
                        reject(e);
                }
            });
        });
    }
    if (socket.readyState == 'open')
    {
        if (!processor)
            processor = new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(socket)));
        if (!metaContainer)
            metaContainer = (await import(new URL('../../commands.json', import.meta.url).toString(), { assert: { type: 'json' } })).default;
        if (!container)
        {
            container = proxy(metaContainer, processor);

            container.unregister(Cli.Metadata.name);
            container.register(Metadata.extractCommandMetadata(Cli.Metadata));

            await container.attach(Triggers.cli, cli);
        }
    }
}).
    // cli.
    //     useMiddleware(null, handle).
    useError(supportInteract(cli))

// handle.action(async args =>
// {
//     try
//     {
//         const cmdName = args.args[0].toString();
//         if (cmdName == '$metadata')
//             return formatResult(metaContainer, args.options.output);
//         else
//         {
//             const cmd = metaContainer.commands.find(c => c.name === cmdName);
//             await tryRun(processor, cmd, args, false);
//         }
//         await new Promise<void>((resolve) => socket.end(resolve));
//     }
//     catch (e)
//     {
//         if (e.code == 'INTERACT')
//         {
//             console.log(e.message);
//             const value = await readLine();
//             if (e.as)
//                 args.options[e] = value;
//             else
//                 args.args.push(value);
//             return handle.handle(args).then(e => { if (e) throw e }, res => res);
//         }
//         if (args.options.verbose)
//             console.log(e);
//         else
//             console.log(e.message)
//         await new Promise<void>((resolve) => socket.end(resolve));
//     }
// });
cli.format(async (result, context) => formatResult(result, context.options.output));
program.useError((err: Error, context) =>
{
    if (context.options.verbose)
        console.error(err);
    else if (err instanceof ErrorMessage)
        console.log(err.message)
    else
        console.error('Error: ' + err.message);
    return Promise.reject(err);
})
program.process(buildCliContextFromProcess()).then(result =>
{
    if (result instanceof Readable)
    {
        result.pipe(process.stdout);
        return;
    }
    if (socket)
        socket.end();
}, err =>
{
    if (err && !(err instanceof ErrorMessage))
        console.error(err);
    process.exit(err && err.statusCode || 50);
});


function formatResult(result: unknown, outputFormat: string)
{
    if (typeof result == 'undefined')
        return;
    if (result instanceof Readable)
    {
        return result;
    }
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