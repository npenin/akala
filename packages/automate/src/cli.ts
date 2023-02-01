#!/usr/bin/env node

import cli, { buildCliContext, buildCliContextFromProcess, CliContext, NamespaceMiddleware } from '@akala/cli'
import { Container, SelfDefinedCommand } from '@akala/commands';
import { logger as LoggerBuilder, LogLevels } from '@akala/core';
import path from 'path';
import { Workflow } from './automate.js';
import workflow from './workflow.js';
import use from './workflow-commands/use.js';

(async function ()
{
    const logger = LoggerBuilder('automate-cli', LogLevels.info)

    const program = cli.option<string>('loader', { needsValue: true, normalize: 'requireMeta' }).
        option<string>('runner', { needsValue: true, normalize: 'require' }).
        option<string>('file', { needsValue: true, normalize: 'require' }).
        option<string>('verbose', { aliases: ['v'] })
    program.action(async context =>
    {
        if (context.options.verbose)
        {
            if (context.options.verbose in LogLevels)
                context.logger.level = LogLevels[context.options.verbose];
            else
            {
                const levelEntry = Object.entries(LogLevels).find((_name, level) => level.toString() == context.options.verbose);
                if (levelEntry)
                    if (typeof (levelEntry[1]) == 'number')
                        context.logger.level = levelEntry[1];
                    else
                        context.logger.level = LogLevels[levelEntry[0]];
            }
        }
        const container: workflow.container & Container<CliContext> = await use.call(context, null, 'workflow', require.resolve('../workflow.json'));
        var loader: Container<CliContext>;

        if (context.options.loader)
            loader = await use.call(context, null, 'loader', context.options.loader);
        else
        {
            loader = new Container('loader', context);
            loader.register(new SelfDefinedCommand((path: string) => require(path), 'load'));
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

        container.register(new SelfDefinedCommand((file: string) => loader.dispatch('load', path.join(path.dirname(context.options.file), file)), 'load'));

        return await container.dispatch('process', workflow);
    });
    program.format(r =>
    {
        console.log('%O', r);
    });
    try
    {
        await program.process(buildCliContextFromProcess(logger));
    }
    catch (e)
    {
        console.error(e);
        process.exit(1);
    }
})();