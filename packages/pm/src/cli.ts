#!/usr/bin/env node
import * as path from 'path'
import { Processors, NetSocketAdapter, Metadata, Container, Processor } from '@akala/commands';
import yargs from 'yargs-parser'
import { Socket } from 'net';
import { platform, homedir } from 'os';
import start from './commands/start'
import { Readable } from 'stream';

import * as Parser from "yargs-parser";
import unparse from "yargs-unparser";
import { spawnAsync } from './cli-helper';
import { DiscoveryOptions } from '@akala/commands/dist/processors';
import State from './state';

type Arguments = ReturnType<typeof Parser.default>;

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

if (require.main == module)
{
    const args = yargs(process.argv.slice(2), { alias: { output: ['o', 'output'] }, number: ["pm-sock"] });

    if (args._[0] == 'start' && (args._[1] == 'pm' || typeof args._[1] == 'undefined'))
    {
        if (typeof args._[1] == 'undefined')
            args._[1] = 'pm';
        start.call({} as unknown as State, null, args._[1], args as unknown);
    }
    else
    {
        // eslint-disable-next-line no-var
        var socket = new Socket();
        process.stdin.pause();
        process.stdin.setEncoding('utf8')

        socket.on('connect', async function ()
        {
            socket.setEncoding('utf-8');
            const processor = new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(socket)));
            (async function send(args: Arguments)
            {
                try
                {
                    const metaContainer: Metadata.Container = await processor.handle('$metadata', { param: [true] }).then(err => { throw err }, res => res);
                    const cmdName = args._[0].toString();
                    if (cmdName == '$metadata')
                        return formatResult(metaContainer, args.output);
                    else
                    {
                        const cmd = metaContainer.commands.find(c => c.name === cmdName);
                        await tryRun(processor, cmd, args, false);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    socket.end(() => { });
                }
                catch (e)
                {
                    if (e.code == 'INTERACT')
                    {
                        console.log(e.message);
                        const value = await readLine();
                        if (e.as)
                            args[e] = value;
                        else
                            args._.push(value);
                        await send(args);
                    }
                    if (args.v)
                        console.log(e);
                    else
                        console.log(e.message)
                    socket.end();
                }
            })(args);
        })
        socket.on('error', (e: Error & { code?: string }) =>
        {
            if (e.code === 'ENOENT')
            {
                tryLocalProcessing(args).catch(() =>
                {
                    console.error('pm is not started');
                });
            }
            else
                console.error(e);
        })

        if (args.pmSock)
        {
            if (typeof (args.pmSock) == 'string')
            {
                const indexOfColon = args.pmSock.indexOf(':');
                if (indexOfColon > -1)
                    socket.connect(Number(args.pmSock.substring(indexOfColon + 1)), args.pmSock.substring(0, indexOfColon));
                else
                    socket.connect(args.pmSock);
            }
            else
                socket.connect(args.pmSock);
        }
        else if (platform() == 'win32')
            socket.connect('\\\\?\\pipe\\pm')
        else
        {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const config = require(path.join(homedir(), './.pm.config.json'));

            socket.connect(path.join(config.containers.pm[0], './pm.sock'));
        }
    }
}

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

function prepareParam(cmd: Metadata.Command, args: yargs.Arguments, standalone?: boolean)
{
    if (cmd)
    {
        if (cmd.config && cmd.config.cli && (!standalone || cmd.config.cli.standalone))
        {
            if (cmd.config.cli.options)
            {
                args = yargs(process.argv.slice(2), cmd.config.cli.options);
                if (cmd.config.cli.options.normalize)
                {
                    if (typeof cmd.config.cli.options.normalize == 'string')
                        cmd.config.cli.options.normalize = [cmd.config.cli.options.normalize];
                    const params = cmd.config.cli.options.normalize.filter(p => p.length > 'param.'.length && p.substr(0, 'param.'.length) == 'param.');
                    if (params.length > 0)
                    {
                        params.forEach(key =>
                        {
                            const positionalIndex = Number(key.substr('param.'.length));
                            if (args._[positionalIndex + 1])
                                args._[positionalIndex + 1] = path.resolve(args._[positionalIndex + 1].toString());
                        });
                    }
                }
            }
        }
        else if (standalone)
            return false;


        args._ = args._.slice(1);

        delete args['pm-sock'];
        delete args.pmSock;
        return { options: args, param: args._, _trigger: 'cli', cwd: process.cwd() };
    }

    return false;
}

async function tryRun(processor: Processor, cmd: Metadata.Command, args: yargs.Arguments, localProcessing: boolean)
{
    const params = prepareParam(cmd, args, localProcessing);
    if (!params)
    {
        throw new Error('Either command does not exist or it is not standalone');
    }
    try
    {
        const result = await processor.handle(cmd, params).then(err => { throw err }, res => res);
        if (result instanceof Readable)
            result.pipe(process.stdout);
        else
            formatResult(result, args.output);
    }

    catch (e)
    {
        if (e.code == 'INTERACT')
        {
            console.log(e.message);
            let value = await readLine();
            value = value.trim();
            if (e.as)
                args[e] = value;
            else
                args._.push(value);
            args._.unshift(cmd.name);
            return await tryRun(processor, cmd, args, localProcessing);
        }
        if (args.v)
            console.log(e);
        else
            console.log(e.message)
        socket.end();
    }

}

async function tryLocalProcessing(args: yargs.Arguments)
{
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(path.join(homedir(), './.pm.config.json'));
    let cmdName = args._.shift();
    const indexOfDot = cmdName.indexOf('.');
    if (indexOfDot > -1)
    {
        const containerName = cmdName.substr(0, indexOfDot);
        if (config.mapping[containerName] && config.mapping[containerName].commandable)
        {
            cmdName = cmdName.substring(indexOfDot + 1);
            const container = new Container('cli-temp', {});
            const options: DiscoveryOptions = {};
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