import { type CliContext } from "@akala/cli";
import { outputHelper } from "../../new.js";
import { type FileHandle, OpenFlags } from "@akala/fs";
import { HttpStatusCode, packagejson } from "@akala/core";

export default async function (target: string, options: CliContext<{ force?: boolean, }>['options'], source?: string)
{
    if (source)
    {
        const { output, outputFs } = await outputHelper(source || target, source ? 'akala.mts' : 'akala.mjs', options && options.force);

        await output.write(`
import { NamespaceMiddleware } from "@akala/cli";
import {Configuration} from "@akala/config";

export default function (config: Configuration, program: NamespaceMiddleware)
{
}
`);
        await output.close();

        const pkgHandle: FileHandle | null = await outputFs.open('./package.json', OpenFlags.ReadWrite).catch(e =>
        {
            if (e.statusCode == HttpStatusCode.NotFound)
                return null;
            throw e;
        })

        if (pkgHandle)
        {
            const pkg = await pkgHandle.readFile<packagejson.CoreProperties>('json');
            if (pkg.exports)
                pkg.exports['./akala'] = target;
            else
                await pkgHandle.writeFile(JSON.stringify(pkg, null, 4));
        }
    }
    else
    {
        const { output } = await outputHelper(target, 'akala.mjs', options && options.force);

        await output.write(`export default function ()
{
}
`);
        await output.close();
    }
}
