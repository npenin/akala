import * as Metadata from '../metadata/index'
import { Trigger } from '../model/trigger';
import * as Processors from '../processors/index';
import { NamespaceMiddleware } from '@akala/cli'
import { each, MiddlewarePromise } from '@akala/core';

export var processTrigger = new Trigger('cli', async (c, program: NamespaceMiddleware<Record<string, string | boolean | string[] | number>>) =>
{
    var meta: Metadata.Container = await c.dispatch('$metadata', true);
    [...meta.commands, c.resolve('$metadata')].forEach(cmd =>
    {
        if (cmd.config?.cli)
        {
            if (cmd.config.cli.usage)
            {
                if (cmd.name.lastIndexOf('.') > -1)
                {
                    var command = program.command(cmd.name.substring(0, cmd.name.lastIndexOf('.')).split('.').join(' ') + ' ' + cmd.config.cli.usage);
                }
                else
                    var command = program.command(cmd.config.cli.usage);
            }
            else
                var command = program.command(cmd.name.split('.').join(' '));

            addOptions(cmd, command);

            let stdin: Promise<string> | undefined;

            command.useMiddleware({
                handle(context)
                {
                    return Processors.Local.execute(cmd, (...args) =>
                    {
                        return c.handle(c, cmd, { param: args, _trigger: 'proxy' });
                    }, c, {
                        context: context, options: context.options, param: context.args, _trigger: 'cli', get stdin()
                        {
                            return stdin || (stdin =
                                new Promise<string>((resolve) =>
                                {
                                    const buffers = [];
                                    process.stdin.on('data', data => buffers.push(data));
                                    process.stdin.on('end', () => resolve(buffers.join('')));
                                    process.stdin.resume();
                                }));
                        }
                    }) as MiddlewarePromise;
                }
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