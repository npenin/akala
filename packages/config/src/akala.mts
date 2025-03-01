import { CliContext, NamespaceMiddleware } from "@akala/cli";
import path from 'path'
import Configuration from "./configuration.js";

export default async function (_, program: NamespaceMiddleware, context: CliContext<{ configFile: string }, object>)
{
    return install(context, program)
}

export async function install(context: CliContext<{ configFile: string }, object>, program: NamespaceMiddleware)
{
    context.state = await Configuration.newAsync(context.options.configFile || path.join(context.currentWorkingDirectory, './.akala.json'), context.state)

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
