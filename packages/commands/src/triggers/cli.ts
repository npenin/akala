import * as Metadata from '../metadata/index.js'
import { Trigger } from '../model/trigger.js';
import * as Processors from '../processors/index.js';
import { NamespaceMiddleware } from '@akala/cli'
import { each, MiddlewarePromise } from '@akala/core';
import { Container } from '../model/container.js'

export function registerCommand<TState>(cmd: Metadata.Command, c: Container<TState>, program: NamespaceMiddleware)
{
    if (cmd.config?.cli)
    {
        if (cmd.config.cli.usage)
        {
            if (cmd.name.lastIndexOf('.') > -1)
            {
                var command = program.command(cmd.name.substring(0, cmd.name.lastIndexOf('.')).split('.').join(' ') + ' ' + cmd.config.cli.usage, cmd.config?.doc?.description);
            }
            else
                var command = program.command(cmd.config.cli.usage, cmd.config?.doc?.description);
        }
        else
            var command = program.command(cmd.name.split('.').join(' '));

        addOptions(cmd, command);

        let stdin: Promise<string> | undefined;

        command.useMiddleware(null, {
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

}

export var processTrigger = new Trigger('cli', async (c, program: NamespaceMiddleware<Record<string, string | boolean | string[] | number>>) =>
{
    var meta: Metadata.Container = await c.dispatch('$metadata', true);
    [...meta.commands, c.resolve('$metadata')].forEach(cmd => registerCommand(cmd, c, program));

    return program.option('help', { needsValue: false, doc: "displays this help message" });
});

export function addOptions(cmd: Metadata.Command, command: NamespaceMiddleware): void
{
    cmd.config?.cli?.inject?.forEach((p, i) =>
    {
        if (p.startsWith('options.'))
        {
            const optionName = p.substring('options.'.length);
            var option = cmd.config.cli.options && cmd.config.cli.options[optionName]
            if ((!option || !option.doc) && cmd.config.doc && cmd.config.doc.options && cmd.config.doc.options[optionName])
                option = Object.assign({}, option, { doc: cmd.config.doc.options[optionName] });
            if ((!option || !option.doc) && cmd.config.doc && cmd.config.doc.inject)
                option = Object.assign({}, option, { doc: cmd.config.doc.inject[i] });

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
            if ((!opt || !opt.doc) && cmd.config.doc && cmd.config.doc.options && cmd.config.doc.options[name])
                opt = Object.assign({}, opt, { doc: cmd.config.doc.options[name] });

            if (!opt?.positional)
                command.option(name, opt)
        })
}