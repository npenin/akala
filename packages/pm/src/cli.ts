#!/usr/bin/env node
import * as path from 'path'
import { Processors, NetSocketAdapter, Metadata, Container, Processor, proxy, Triggers } from '@akala/commands';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { platform, homedir } from 'os';
import start from './commands/start.js'
import { Readable } from 'stream';

import { spawnAsync } from './cli-helper.js';
import State from './state.js';
import program, { buildCliContextFromProcess, CliContext, NamespaceMiddleware, unparse } from '@akala/cli';
import { InteractError } from '.';

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

type CliOptions = { output: string, verbose: boolean, pmSock: string | number, tls: boolean };

const cli = program.options<CliOptions>({ output: { aliases: ['o'] }, verbose: { aliases: ['v'] }, tls: {}, pmSock: { aliases: ['pm-sock'], needsValue: true } });
cli.command<{ program: string, inspect?: boolean, wait?: boolean }>('start [program]')
    .option('inspect')
    .option('wait', { aliases: ['w'] })
    .action(c =>
    {
        if (typeof c.options.program == 'undefined')
            c.options.program = 'pm';
        if (c.options.program === 'pm')
            start.call({} as unknown as State, null, c.options.program, c);
        else
            throw undefined;
    });

let socket: Socket;
let processor: Processors.JsonRpc;
let metaContainer: Metadata.Container;
let container: Container<unknown>;
const handle = new NamespaceMiddleware<CliOptions>(null);
cli.command(null).preAction(async c =>
{
    process.stdin.pause();
    process.stdin.setEncoding('utf8');
    if (!socket)
    {
        const netsocket = socket = new Socket();
        if (c.options.tls)
        {
            socket = new TLSSocket(socket, {});
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
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const config = require(path.join(homedir(), './.pm.config.json'));

                netsocket.connect(config.mapping.pm.connect.socket[0]);
            }
            if (c.options.tls)
            {
                // socket.on('data', function (e) { console.log(e) });
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
            socket.on('error', (e: Error & { code?: string }) =>
            {
                if (e.code === 'ENOENT')
                {
                    tryLocalProcessing(c).catch(() =>
                    {
                        console.error('pm is not started');
                    });
                }
                else
                    reject(e);
            })
        });
    }

    if (!processor)
        processor = new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(socket)));
    if (!metaContainer)
        metaContainer = await processor.handle('$metadata', { param: [true] }).then(err => { if (err) throw err }, res => res);
    if (!container)
    {
        container = proxy(metaContainer, processor);
        container.attach(Triggers.cli, handle);
    }
}).
    useMiddleware(handle).
    useError(async (err: InteractError, args) =>
    {
        if (err.code === 'INTERACT')
        {
            console.log(err.message);
            const value = await readLine();
            if (typeof err.as == 'string')
                args.options[err.as] = value;
            else
                args.args.push(value);
            return await cli.process(args);
        }
    })

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
cli.format((result, context) => formatResult(result, context.options.output));
program.process(buildCliContextFromProcess()).then(r =>
{
    if (socket)
        socket.end();
}, err =>
{
    console.error(err);
    process.exit(500);
});


function formatResult(result: unknown, outputFormat: string)
{
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

function prepareParam(cmd: Metadata.Command, args: CliContext, standalone?: boolean)
{
    if (!cmd)
        return false;

    if (!cmd.config || !cmd.config.cli || (standalone && !cmd.config.cli.standalone))
        return false;

    delete args.options.pmSock;
    return { options: args.options, param: args.args.slice(1), _trigger: 'cli', cwd: args.currentWorkingDirectory, context: args };
}

async function tryRun(processor: Processor, cmd: Metadata.Command, args: CliContext, localProcessing: boolean)
{
    const params = prepareParam(cmd, args, localProcessing);
    if (!params)
        throw new Error('Either command does not exist or it is not standalone');

    try
    {

        const result = await processor.handle(cmd, params).then(err => { throw err }, res => res);
        if (result instanceof Readable)
            result.pipe(process.stdout);
        else
            formatResult(result, args.options.output as string);
    }

    catch (e)
    {
        if (e.code == 'INTERACT')
        {
            console.log(e.message);
            let value = await readLine();
            value = value.trim();
            if (e.as)
                args.options[e] = value;
            else
                args.args.push(value);
            args.args.unshift(cmd.name);
            return await tryRun(processor, cmd, args, localProcessing);
        }
        if (args.options.verbose)
            console.log(e);
        else
            console.log(e.message);
    }

}

async function tryLocalProcessing(args: CliContext)
{
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(path.join(homedir(), './.pm.config.json'));
    let cmdName = args.args.shift();
    const indexOfDot = cmdName.indexOf('.');
    if (indexOfDot > -1)
    {
        const containerName = cmdName.substr(0, indexOfDot);
        if (config.mapping[containerName] && config.mapping[containerName].commandable)
        {
            cmdName = cmdName.substring(indexOfDot + 1);
            const container = new Container('cli-temp', {});
            const options: Processors.DiscoveryOptions = {};
            await Processors.FileSystem.discoverCommands(config.mapping[containerName].path, container, options);
            const cmd = container.resolve(cmdName);
            return tryRun(options.processor, cmd, args, true);
        }
    }
    else
    {
        if (!config.mapping[cmdName].commandable)
            return spawnAsync(config.mapping[cmdName].path, null, ...unparse(args));
    }
}

let stdinBuffer = '';
function readLine()
{
    process.stdin.pause();
    return new Promise<string>((resolve) =>
    {

        process.stdin.on('data', function processChunk(chunk)
        {
            const indexOfNewLine = stdinBuffer.length + chunk.indexOf('\n');
            stdinBuffer += chunk;
            if (indexOfNewLine > -1)
            {
                process.stdin.pause();
                process.stdin.removeListener('data', processChunk);
                if (indexOfNewLine < stdinBuffer.length - 1)
                {
                    resolve(stdinBuffer.substr(0, indexOfNewLine));
                    stdinBuffer = stdinBuffer.substr(indexOfNewLine + 1);
                }
                else
                {
                    resolve(stdinBuffer);
                    stdinBuffer = '';
                }
            }
        })
        process.stdin.resume();
    })
}