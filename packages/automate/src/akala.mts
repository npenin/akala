import { buildCliContext, type CliContext, NamespaceMiddleware } from '@akala/cli'
import { Container, SelfDefinedCommand } from '@akala/commands';
import { LogLevels } from '@akala/core';
import path from 'path';
import { type Workflow } from './index.js';
import workflow from './workflow.js';
import use from './workflow-commands/use.js';

export default function (config, cli: NamespaceMiddleware)
{
    // const logger = LoggerBuilder('automate-cli', LogLevels.info)

    const program = cli.command('run [file]').option('loader', { needsValue: true, normalize: 'requireMeta' }).
        option('runner', { needsValue: true, normalize: 'require' }).
        option('file', { needsValue: true, normalize: 'require' }).
        option('verbose', { aliases: ['v'], default: 'help' })
    program.action(async context =>
    {
        if (context.options.verbose)
        {
            if (context.options.verbose in LogLevels)
                context.logger.maxLevel = LogLevels[context.options.verbose];
            else
            {
                const levelEntry = Object.entries(LogLevels).find((_name, level) => level.toString() == context.options.verbose);
                if (levelEntry)
                    if (typeof (levelEntry[1]) == 'number')
                        context.logger.maxLevel = levelEntry[1];
                    else
                        context.logger.maxLevel = LogLevels[levelEntry[0]];
            }
        }
        const container: workflow.container & Container<CliContext> = await use.call(context, null, 'workflow', new URL('../../workflow.json', import.meta.url));
        let loader: Container<CliContext>;

        if (context.options.loader)
            loader = await use.call(context, null, 'loader', context.options.loader as string);
        else
        {
            loader = new Container('loader', context);
            loader.register(new SelfDefinedCommand((path: string) => import(path), 'load'));
        }
        container.register(loader);

        const workflow = await loader.dispatch('load', context.options.file) as Workflow;
        if (workflow.parameters)
        {
            const workflowProgram = workflow.parameters.reduce((program, p) => program.option(p), new NamespaceMiddleware(null))
            workflowProgram.action(ctx =>
            {
                Object.assign(context.options, ctx.options);
            });
            await workflowProgram.process(buildCliContext(context.logger, ...context.args));
        }

        container.register(new SelfDefinedCommand((file: string) => loader.dispatch('load', path.join(path.dirname(context.options.file as string), file)), 'load'));

        return await container.dispatch('process', workflow);
    });
    program.format(async r =>
    {
        console.log('%O', r);
    });
}
