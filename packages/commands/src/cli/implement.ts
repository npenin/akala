import { type CliContext } from "@akala/cli";
import { mkdir } from "fs/promises";
import { join } from "path";
import { type Container } from "../metadata/index.js";
import command from "./new/command.js";
import { newCommandConfiguration } from "./new/command-config.js";
import { openFile, OpenFlags } from "@akala/fs";
import { resolveToTypeScript } from "./generate-ts-from-schema.js";

export default async function implement(pathToCommandFile: string, destination: string, options: CliContext<{ force?: boolean }>['options']): Promise<void>
{
    // let commandsUrl: URL;
    // if (!URL.canParse(pathToCommandFile))
    //     commandsUrl = pathToFileURL(pathToCommandFile);
    // else
    //     commandsUrl = new URL(pathToCommandFile);
    // const sourceFs = await fsHandler.process(commandsUrl);


    var metadata = await (await openFile(pathToCommandFile, OpenFlags.Read)).readFile<Container>('json');
    try
    {
        await mkdir(join(destination, metadata.name), { recursive: true });
    }
    catch (e)
    {
        if (e.code !== 'EEXIST')
            throw e;
    }
    await Promise.all(metadata.commands.map(async c =>
    {
        if (!c.config)
            c.config = {};
        let paramConfig: { name: string, type?: string }[];// = c.config["types"] && c.config["types"].inject && c.config["types"].inject.map((a, i) => ({ name: a, type: c.config["types"].types && c.config["types"].types[i] }));
        const types = {};
        if (c.config.schema)
        {
            paramConfig = (await Promise.all(Array.isArray(c.config.schema.inject) ? c.config.schema.inject.map(x =>
                resolveToTypeScript(x as string, { '#': c.config.schema }, types)) : null)).map((type, i) => ({ name: c.config?.[""]?.inject[i].replace(/\./g, ''), type }));
        }
        if (!paramConfig)
            paramConfig = Array.isArray(c.config?.[""]?.inject) ? c.config[""].inject.map((p, i) => ({ name: typeof p == 'string' && p.replace(/\./g, '') || 'arg' + i })) : [];

        await command(c.name, options, join(destination, metadata.name), paramConfig, c.config.schema?.resultSchema ? (await resolveToTypeScript(c.config.schema?.resultSchema, { '#': c.config.schema }, types)) : '', {
            async preFunctionDeclaration(output)
            {
                for (const e of Object.entries(types))
                {
                    const namespaces = e[0].split('.');
                    if (namespaces.length > 1)
                    {
                        await output.write(`export namespace ${namespaces.slice(0, -1).join('.')} {
    export type ${namespaces[namespaces.length - 1]}=${e[1]};
}\n`)
                    }
                    else

                        await output.write(`export type ${e[0].replace(/\./g, '_')
                            }=${e[1]}; \n`);
                }
            },
        });
        if (!c.config.fs)
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.config.fs = { inject: c.config[""]?.inject || [] } as any;
        c.config.fs.path = join(destination, metadata.name, c.name + '.ts');
        c.config.fs.source = join(destination, metadata.name, c.name + '.ts');
        await newCommandConfiguration(c, options, join(destination, metadata.name));
    }
    ));
}
