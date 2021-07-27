#!/usr/bin/env node

import cli, { buildCliContext, buildCliContextFromProcess, CliContext, NamespaceMiddleware } from '@akala/cli'
import { Command, configure, Container } from '@akala/commands';
import path from 'path';
import { object } from '@akala/core/src/each';
import { Workflow } from './automate';
import workflow from './workflow';
import use from './workflow-commands/use';

(async function ()
{
    const program = cli.option<string>('loader', { needsValue: true, normalize: true }).
        option<string>('runner', { needsValue: true, normalize: true }).
        option<string>('file', { needsValue: true, normalize: true });
    program.action(async context =>
    {
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

        return container.dispatch('process', workflow);
    });
    program.format(r =>
    {
        console.log(r);
    });
    return await program.process(buildCliContextFromProcess());
})();