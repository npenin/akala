import { CliContext } from "@akala/cli";
import { ErrorWithStatus } from "@akala/core";
import { createWriteStream } from "fs";
import path from "path";
import { Processors } from "../../index.js";
import { Command } from "../../metadata/command.js";
import { outputHelper, write } from "../new.js";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var cmds = await Processors.FileSystem.discoverMetaCommands(destination, { processor: new Processors.FileSystem(destination), ignoreFileWithNoDefaultExport: true });
    const cmd = cmds.find(c => c.name == name);
    if (!cmd)
        throw new ErrorWithStatus(44, `No command with name ${name} could be found in ${destination}`)

    await newCommandConfiguration(cmd, options, destination);
}

export async function newCommandConfiguration(cmd: Command, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var { output, outputFile } = await outputHelper(path.resolve(destination, cmd.config?.fs?.source && path.dirname(cmd.config.fs.source)), cmd.name + '.json', options && options.force);
    if (!output)
        output = createWriteStream(outputFile);
    if (cmd.config?.fs?.source)
        delete cmd.config.fs.source;
    if (cmd.config?.fs?.path)
        delete cmd.config.fs.path;
    await write(output, JSON.stringify({ $schema: "https://raw.githubusercontent.com/npenin/akala/master/packages/commands/command-schema.json", ...cmd.config }, null, 4));
    await new Promise(resolve => output.end(resolve));
}