import * as path from 'path'
import { Processors, NetSocketAdapter, Metadata, Container, ICommandProcessor, proxy, Triggers, Cli } from '@akala/commands';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { platform, homedir } from 'os';
import start from './commands/start.js'
import { Readable } from 'stream';

import { spawnAsync } from './cli-helper.js';
import State, { StateConfiguration } from './state.js';
import program, { buildCliContextFromProcess, CliContext, ErrorMessage, NamespaceMiddleware, unparse } from '@akala/cli';
import { InteractError } from './index.js';
import { Binding } from '@akala/core';
import module from 'module'

const require = module.createRequire(import.meta.url);

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
export default function (_config, program: NamespaceMiddleware)
{

    const cli = program.command('pm').state<{ pm?: StateConfiguration }>().options<CliOptions>({ output: { aliases: ['o'], needsValue: true, doc: 'output as `table` if array otherwise falls back to standard node output' }, verbose: { aliases: ['v'] }, tls: { doc: "enables tls connection to the `pmSock`" }, pmSock: { aliases: ['pm-sock'], needsValue: true, doc: "path to the unix socket or destination in the form host:port" }, help: { doc: "displays this help message" } });
    cli.command('start pm')
        .option('inspect', { doc: "starts the process with --inspect-brk parameter to help debugging" })
        .option('keepAttached', { doc: "keeps the process attached" })
        .action(c =>
        {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.options['name'] = 'pm'
            c.options['program'] = require.resolve('../../commands.json');
            return start.call({} as unknown as State, null, 'pm', c as any);
        });

    let socket: Socket;
    let processor: Processors.JsonRpc;
    let metaContainer: Metadata.Container;
    let container: Container<unknown>;
    const handle = new NamespaceMiddleware(null);
    cli.preAction(async c =>
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
                    try
                    {
                        if (c.state?.pm)
                            netsocket.connect(c.state.pm.mapping.pm.connect.socket[0]);
                        else
                            netsocket.destroy(Object.assign(new Error(), { code: 'ENOENT' }))
                    }
                    catch (e)
                    {
                        if (e.code != 'MODULE_NOT_FOUND')
                            reject(e);
                        else
                        {
                            e.code = 'ENOENT';
                            socket.destroy(e);
                        }

                    }
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
                metaContainer = require('../../commands.json');
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
        useError(async (err: InteractError, args) =>
        {
            if (err.code === 'INTERACT')
            {
                console.log(err.message);
                const value = await readLine();
                if (typeof err.as == 'string')
                {
                    const indexOfDot = err.as.indexOf('.');
                    if (indexOfDot > 0)
                    {
                        Binding.getSetter(args.options, err.as)(value);
                    }
                    args.options[err.as] = value;
                }
                else
                    args.args.push(value);
                return await cli.process(args);
            }
            throw err;
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
    cli.format((result, context) =>
    {
        if (result instanceof Readable)
        {
            result.pipe(process.stdout);
            return;
        }
        if (socket)
            socket.end();

        formatResult(result, context.options.output);
    });
    program.useError((err: Error, context) =>
    {
        if (context.options.verbose)
            console.error(err);
        else if (err instanceof ErrorMessage)
            console.log(err.message)
        else
            console.error('Error: ' + err.message);
        return Promise.resolve();
    })
}

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

function prepareParam(cmd: Metadata.Command, args: CliContext, standalone?: boolean)
{
    if (!cmd)
        return false;

    if (!cmd.config || !cmd.config.cli || (standalone && !cmd.config.cli.standalone))
        return false;

    delete args.options.pmSock;
    return {
        options: args.options, param: args.args.slice(1), _trigger: 'cli', cwd: args.currentWorkingDirectory, context: args, get stdin()
        {
            return new Promise<string>((resolve) =>
            {
                const buffers = [];
                process.stdin.on('data', data => buffers.push(data));
                process.stdin.on('end', () => resolve(Buffer.concat(buffers).toString('utf8')));
            })
        }
    };
}

async function tryRun(processor: ICommandProcessor, cmd: Metadata.Command, args: CliContext, localProcessing: boolean)
{
    const params = prepareParam(cmd, args, localProcessing);
    if (!params)
        throw new Error('Either command does not exist or it is not standalone');

    try
    {
        const result = await processor.handle(null, cmd, params).then(err => { throw err }, res => res);
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
    const config: StateConfiguration = require(path.join(homedir(), './.pm.config.json'));
    let cmdName = args.args.shift();
    if (!cmdName)
        throw undefined;
    const indexOfDot = cmdName.indexOf('.');
    if (indexOfDot > -1)
    {
        const containerName = cmdName.substring(0, indexOfDot);
        if (config.containers[containerName] && config.containers[containerName].commandable)
        {
            cmdName = cmdName.substring(indexOfDot + 1);
            const container = new Container('cli-temp', {});
            const options: Processors.DiscoveryOptions = {};
            await Processors.FileSystem.discoverCommands(config.containers[containerName].path, container, options);
            const cmd = container.resolve(cmdName);
            return tryRun(options.processor, cmd, args, true);
        }
    }
    else
    {
        if (!config.containers[cmdName].commandable)
            return spawnAsync(config.containers[cmdName].path, null, ...unparse(args));
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