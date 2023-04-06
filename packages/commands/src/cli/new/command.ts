import { CliContext } from "@akala/cli";
import { outputHelper, write } from "../new.js";
import { createWriteStream } from "fs";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string, args?: { name: string, type?: string }[])
{
    var { output } = await outputHelper(destination, name + '.ts', options && options.force);

    await write(output, `export default async function ${name}(${args?.map(a => a.type ? a.name + ': ' + a.type : a.name)?.join(', ') || ''})
{

}`);
    await new Promise(resolve => output.end(resolve));

}