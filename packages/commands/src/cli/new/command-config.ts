import { CliContext } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import path from "path";
import { Processors } from "../../index.js";
import { Command } from "../../metadata/command.js";
import { outputHelper, write } from "../../new.js";
import { pathToFileURL } from "url";
import fsHandler from "@akala/fs";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var container = await Processors.FileSystem.discoverMetaCommands(destination, { fs: await fsHandler.process(pathToFileURL(process.cwd() + '/')), relativeTo: pathToFileURL(process.cwd() + '/'), processor: new Processors.FileSystem(pathToFileURL(destination)), ignoreFileWithNoDefaultExport: true });
    const cmd = container.commands.find(c => c.name == name);
    if (!cmd)
        throw new ErrorWithStatus(44, `No command with name ${name} could be found in ${destination}`)

    await newCommandConfiguration(cmd, options, destination);
}

export async function newCommandConfiguration(cmd: Command, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var { output } = await outputHelper(cmd.config?.fs?.source && path.dirname(cmd.config.fs.source) || destination, cmd.name + '.json', options && options.force);

    if (cmd.config?.fs?.source)
        delete cmd.config.fs.source;
    if (cmd.config?.fs?.path)
        delete cmd.config.fs.path;
    await write(output, JSON.stringify({ $schema: "https://raw.githubusercontent.com/npenin/akala/main/packages/commands/command-schema.json", ...cmd.config }, null, 4));
    await new Promise(resolve => output.end(resolve));
}
