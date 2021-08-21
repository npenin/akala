#!/usr/bin/env node

import cli, { buildCliContext, buildCliContextFromProcess, CliContext, NamespaceMiddleware } from '@akala/cli'
import { Command, configure, Container } from '@akala/commands';
import path from 'path';
import { object } from '@akala/core/src/each';
import { logger, Workflow } from './automate';
import workflow from './workflow';
import use from './workflow-commands/use';
import winston from 'winston';

(async function ()
{
    logger.level = 'warn';
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
    logger['rejections'].handle(new winston.transports.Console({ format: winston.format.simple() }));

    const program = cli.option<string>('loader', { needsValue: true, normalize: true }).
        option<string>('runner', { needsValue: true, normalize: true }).
        option<string>('file', { needsValue: true, normalize: true }).
        option<string>('verbose', { aliases: ['v'] })
    program.action(async context =>
    {
        if (context.options.verbose)
        {
            if (context.options.verbose in logger.levels)
                logger.level = context.options.verbose;
            else
            {
                const levelEntry = Object.entries(logger.levels).find((_name, level) => level.toString() == context.options.verbose);
                if (levelEntry)
                    logger.level = levelEntry[0];
            }
        }
        const container: workflow.container & Container<CliContext> = await use.call(context, null, 'workflow', require.resolve('../workflow.json'));
        var loader: Container<CliContext>;

        if (context.options.loader)
            loader = await use.call(context, null, 'loader', context.options.loader);
        else
        {
            loader = new Container('loader', context);
            loader.register(new Command((path: string) => require(path), 'load'));
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
            await workflowProgram.process(buildCliContext(...context.args));
        }

        container.register(new Command((file: string) => loader.dispatch('load', path.join(path.dirname(context.options.file), file)), 'load'));

        return await container.dispatch('process', workflow);
    });
    program.format(r =>
    {
        console.log(r);
    });
    try
    {
        return await program.process(buildCliContextFromProcess());
    }
    catch (e)
    {
        console.error(e);
        process.exit(1);
    }
})();