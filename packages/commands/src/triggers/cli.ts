import * as Metadata from '../metadata'
import { Trigger } from '../model/trigger';
import { Processors } from '..';
import { NamespaceMiddleware } from '@akala/cli'

export var processTrigger = new Trigger('cli', async (c, program: NamespaceMiddleware<Record<string, string | boolean | string[] | number>>) =>
{
    var meta: Metadata.Container = await c.dispatch('$metadata');
    meta.commands.forEach(cmd =>
    {
        if (cmd.config?.cli)
        {
            if (cmd.config.cli.usage)
                var command = program.command(cmd.config.cli.usage);
            else
                var command = program.command(cmd.name.split('.').join(' '));

            addOptions(cmd, command);

            command.action(async (context) =>
            {
                return await Processors.Local.execute(cmd, (...args) =>
                {
                    return c.dispatch(cmd.name, ...args);
                }, c, { option: context.options, param: context.args });
            });
        }
    });

    return program;
});

export function addOptions(cmd: Metadata.Command, command: NamespaceMiddleware): void
{
    cmd.inject.forEach(p =>
    {
        if (p.startsWith('option.'))
        {
            const optionName = p.substring('option.'.length);
            command.option(optionName, cmd.config.cli.options[optionName])
        }
    });
}