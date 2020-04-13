#!/usr/bin/env node
import * as path from 'path'
import { Processors, NetSocketAdapter, Metadata, proxy } from '@akala/commands';
import yargs from 'yargs-parser'
import { Socket } from 'net';
import { platform, homedir } from 'os';
import start from './commands/start'

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
    var args = yargs(process.argv.slice(2), { alias: { output: ['o', 'output'] } });

    if (args._[0] == 'start' && (args._[1] == 'pm' || typeof args._[1] == 'undefined'))
    {
        if (typeof args._[1] == 'undefined')
            args._[1] = 'pm';
        start.call({} as any, null as any, args._[1], args);
    }
    else
    {
        var socket = new Socket();
        process.stdin.pause();
        process.stdin.setEncoding('utf8')

        socket.on('connect', async function ()
        {
            socket.setEncoding('utf-8');
            var processor = new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(socket)));
            (async function send(args: yargs.Arguments)
            {
                try
                {
                    var metaContainer: Metadata.Container = await processor.process('$metadata', { param: [] });
                    var cmdName = args._[0];
                    var cmd = metaContainer.commands.find(c => c.name === cmdName);
                    if (cmd)
                        if (cmd.config && cmd.config.cli && cmd.config.cli.options)
                            args = yargs(process.argv.slice(3), cmd.config.cli.options);
                        else
                            args._ = args._.slice(1);
                    else
                        args._ = args._.slice(1);
                    var result = await processor.process(cmdName, { options: args, param: args._, _trigger: 'cli', cwd: process.cwd() } as any);

                    socket.end(() =>
                    {
                        switch (args.output)
                        {
                            case 'table':
                                var columnNames: string[] = [];
                                var columns: { [key: string]: { maxWidthContent: number, maxWidth: number, values: string[] } } = {};
                                if (Array.isArray(result))
                                {
                                    for (var r of result)
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

                                        for (var r of result)
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

                                    var columnNamesForDisplay = columnNames.slice(0);
                                    var width = columnNamesForDisplay.reduce((length, c, i) => columns[columnNames[i]].maxWidth + length, 0) + columnNamesForDisplay.length + 1
                                    if (process.stdout.columns < width)
                                    {
                                        for (var c of columnNames)
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
                                                var newName = c.substring(0, 8) + truncate;
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
                                            for (var pad = 0; pad < (columns[columnNames[i]].maxWidth - c.length) / 2; pad++)
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
                                                var value = columns[columnNames[i]].values[r];
                                                for (var pad = 0; pad < Math.floor((columns[columnNames[i]].maxWidth - value.length) / 2); pad++)
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
                            default:
                                console.log(result);
                                break;
                        }
                    })
                }
                catch (e)
                {
                    if (e.code == 'INTERACT')
                    {
                        console.log(e.message);
                        var value = await readLine();
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
        socket.on('error', (e: any) =>
        {
            if (e.code == 'ENOENT')
                console.error('pm is not started');
            else
                console.error(e);
        })

        if (platform() == 'win32')
            socket.connect('\\\\?\\pipe\\pm')
        else
        {
            var config = require(path.join(homedir(), './.pm.config.json'));

            socket.connect(path.join(config.containers.pm[0], './pm.sock'));
        }
    }
}

var stdinBuffer: string = '';
function readLine()
{
    process.stdin.pause();
    return new Promise<string>((resolve) =>
    {

        process.stdin.on('data', function processChunk(chunk)
        {
            var indexOfNewLine = stdinBuffer.length + chunk.indexOf('\n');
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