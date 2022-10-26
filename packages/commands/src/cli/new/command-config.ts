import { CliContext, ErrorWithStatus } from "@akala/cli";
import path from "path";
import { Processors } from "../../index";
import { Command } from "../../metadata/command";
import { outputHelper, write } from "../new";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var cmds = await Processors.FileSystem.discoverMetaCommands(destination, { processor: new Processors.FileSystem(destination) });
    const cmd = cmds.find(c => c.name == name);
    if (!cmd)
        throw new ErrorWithStatus(44, `No command with name ${name} could be found in ${destination}`)

    await newCommandConfiguration(cmd, options, destination);
}

export async function newCommandConfiguration(cmd: Command, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var { output } = await outputHelper(path.resolve(destination, cmd.config?.fs?.source && path.dirname(cmd.config.fs.source)), cmd.name + '.json', options && options.force);
    if (cmd.config?.fs?.source)
        delete cmd.config.fs.source;
    if (cmd.config?.fs?.path)
        delete cmd.config.fs.path;
    await write(output, JSON.stringify({ $schema: "https://raw.githubusercontent.com/npenin/akala/master/packages/commands/command-schema.json", ...cmd.config }, null, 4));
    await new Promise(resolve => output.end(resolve));
}