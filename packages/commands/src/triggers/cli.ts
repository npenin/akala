import * as Metadata from '../metadata/index.js'
import { Trigger } from '../model/trigger.js';
import { NamespaceMiddleware } from '@akala/cli'
import { each } from '@akala/core';
import { Container } from '../model/container.js'

export function registerCommand<TState>(cmd: Metadata.Command, c: Container<TState>, program: NamespaceMiddleware)
{
    let command: NamespaceMiddleware;
    if (cmd.config?.cli)
    {
        if (cmd.config.cli.usage)
        {
            if (cmd.name.lastIndexOf('.') > -1)
            {
                command = program.command(cmd.name.substring(0, cmd.name.lastIndexOf('.')).split('.').join(' ') + ' ' + cmd.config.cli.usage, cmd.config?.doc?.description);
            }
            else
                command = program.command(cmd.config.cli.usage, cmd.config?.doc?.description);
        }
        else
            command = program.command(cmd.name.split('.').join(' '));

        addOptions(cmd, command);

        let stdin: Promise<string> | undefined;

        command.useMiddleware(null, {
            handle(context)
            {
                return c.handle(c, cmd, {
                    param: context.args,
                    context: context, options: context.options, _trigger: 'cli', get stdin()
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
                });
            }
        });
    }

}

export const processTrigger = new Trigger('cli', async (c, program: NamespaceMiddleware<Record<string, string | boolean | string[] | number>>) =>
{
    const meta: Metadata.Container = await c.dispatch('$metadata', true);
    [...meta.commands, c.resolve('$metadata')].forEach(cmd => registerCommand(cmd, c, program));

    return program.option('help', { needsValue: false, doc: "displays this help message" });
});

export function addOptions(cmd: Metadata.Command, command: NamespaceMiddleware): void
{
    cmd.config?.cli?.inject?.forEach((p, i) =>
    {
        if (typeof p == 'string' && p.startsWith('options.'))
        {
            const optionName = p.substring('options.'.length);
            let option = cmd.config.cli.options?.[optionName]
            if ((!option?.doc) && cmd.config.doc?.options?.[optionName])
                option = { ...option, doc: cmd.config.doc.options[optionName] };
            if ((!option?.doc) && cmd.config.doc?.inject)
                option = { ...option, doc: cmd.config.doc.inject[i].toString() };

            if (!option?.positional)
                command.option(optionName, option)
        }
    });
    if (cmd.config?.cli?.options)
        each(cmd.config.cli.options, (opt, name) =>
        {
            if (typeof name != 'string')
                return;
            if (cmd.config.cli.inject.indexOf('options.' + name) > -1)
                return;
            if (!opt?.doc && cmd.config.doc?.options?.[name])
                opt = { ...opt, doc: cmd.config.doc.options[name] };

            if (!opt?.positional)
                command.option(name, opt)
        })
}
