import { CliContext } from "@akala/cli";
import { outputHelper, write } from "../new";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string)
{
    var { output } = await outputHelper(destination, name + '.ts', options && options.force);
    await write(output, `export default async function ${name}()
{

}`);
    await new Promise(resolve => output.end(resolve));

}