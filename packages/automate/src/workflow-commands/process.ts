import { CliContext } from "@akala/cli";
import { Container } from "@akala/commands";
import automate, { JobStepDispatch, JobStepJob, JobStepRun, MiddlewareRunner, JobStepUse, Workflow, simpleRunner, TMiddlewareRunner, MiddlewareRunnerMiddleware } from "../automate";
import path from 'path'
import use from './use';

export function DispatchMiddleware(container: Container<unknown>, runner: TMiddlewareRunner): MiddlewareRunner<JobStepDispatch>
{
    return new MiddlewareRunnerMiddleware('dispatch', (context, step) => container.handle(container, step.dispatch, { _trigger: 'automate', ...step.with, ...context, param: [], runner }));
}


export function JobMiddleware(self: Container<unknown>, runner: TMiddlewareRunner): MiddlewareRunner<JobStepJob>
{
    return new MiddlewareRunner('job',
        async (context, step, stdio) =>
            await automate((await self.dispatch('load', step.job)), runner, { ...context, ...step.with }, stdio)
    );
}

export function UsesMiddleware(container: Container<unknown>): MiddlewareRunner<JobStepUse>
{
    return new MiddlewareRunner('uses', (context: CliContext<{ file: string }>, step) =>
    {
        return use.call(context, container, step.with?.name, path.join(path.dirname(context.options.file), step.uses));
    });
}

export function runnerMiddleware<T>(container: Container<T>, self: Container<CliContext>)
{
    const runner = simpleRunner(container.name)
    runner.useMiddleware(49, UsesMiddleware(container));
    runner.useMiddleware(100, JobMiddleware(self, runner));
    runner.useMiddleware(100, DispatchMiddleware(container, runner));
    return runner;
}

export default function process<U extends object>(this: CliContext<{ file: string }>, workflow: Workflow, inputs: object, self: Container<CliContext>)
{
    const container = new Container<object>(workflow.name + '-' + new Date().toISOString(), this);
    container.register('loader', self);

    return automate<U, JobStepDispatch | JobStepRun | JobStepJob>(workflow, runnerMiddleware(container, self), { ...this, ...inputs, logger: this.logger }, 'ignore');
}