import * as Metadata from '../metadata/index.js'
import { Trigger } from '../model/trigger.js';
import * as Processors from '../processors/index.js';
import { NamespaceMiddleware } from '@akala/cli'
import { each } from '@akala/core';

export var processTrigger = new Trigger('cli', async (c, program: NamespaceMiddleware<Record<string, string | boolean | string[] | number>>) =>
{
    var meta: Metadata.Container = await c.dispatch('$metadata');
    [...meta.commands, c.resolve('$metadata')].forEach(cmd =>
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
                    return c.dispatch(cmd.name, { param: args, _trigger: 'proxy' });
                }, c, { context: context, options: context.options, param: context.args, _trigger: 'cli' });
            });
        }
    });

    return program;
});

export function addOptions(cmd: Metadata.Command, command: NamespaceMiddleware): void
{
    cmd.config?.cli?.inject?.forEach(p =>
    {
        if (p.startsWith('options.'))
        {
            const optionName = p.substring('options.'.length);
            command.option(optionName, cmd.config.cli.options && cmd.config.cli.options[optionName])
        }
    });
    if (cmd.config?.cli?.options)
        each(cmd.config.cli.options, (opt, name) =>
        {
            if (typeof name != 'string')
                return;
            if (cmd.config.cli.inject.indexOf('options.' + name) > -1)
                return;
            command.option(name, opt)
        })
}