import { CliContext, NamespaceMiddleware } from "@akala/cli";
import path from 'path'
import Configuration from "./configuration.js";

export default async function (_config, program: NamespaceMiddleware, context: CliContext)
{
    context.state = await Configuration.newAsync(context.options['configFile'] as string, _config)

    program.format(async r =>
    {
        if (r instanceof Configuration)
            return r.extract();
        return r;
    })

    const config = program.command('config').state<Configuration>();
    config.command('set <key> [value]')
        .action(async function (context)
        {
            context.state.set(context.options['key'] as string, context.options['value'])
            await context.state.commit();
        });

    config.command('get [key]')
        .action(function (context)
        {
            return Promise.resolve(context.state.get(context.options['key'] as string));
        });
}

export async function install(context: CliContext<{ configFile: string }, object>)
{
    context.state = await Configuration.newAsync(context.options.configFile || path.join(context.currentWorkingDirectory, './.akala.json'), context.state)
}