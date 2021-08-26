import { CliContext } from "@akala/cli";
import { Container } from "@akala/commands";
import automate, { JobStepDispatch, JobStepJob, JobStepRun, MiddlewareRunner, interpolate, JobStepUse, IfMiddleware, RunMiddleware, LogMiddleware, Workflow, ForeachMiddleware, simpleRunner, TMiddlewareRunner } from "../automate";
import path from 'path'
import use from './use';

export function DispatchMiddleware(container: Container<any>): MiddlewareRunner<JobStepDispatch>
{
    return new MiddlewareRunner('dispatch', (context, step) => container.dispatch(step.dispatch, { _trigger: 'automate', ...step.with, ...context, param: [] }));
}


export function JobMiddleware(self: Container<any>, runner: TMiddlewareRunner<any>): MiddlewareRunner<JobStepJob>
{
    return new MiddlewareRunner('job',
        async (context, step, stdio) =>
            await automate((await self.dispatch('load', step.job)), runner, { ...context, ...step.with }, stdio)
    );
}

export function UsesMiddleware(container: Container<any>): MiddlewareRunner<JobStepUse>
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
    runner.useMiddleware(100, DispatchMiddleware(container));
    return runner;
}

export default function process<U extends object>(this: CliContext<{ file: string }>, workflow: Workflow, inputs: object, self: Container<CliContext>)
{
    const container = new Container<object>(workflow.name + '-' + new Date().toISOString(), this);
    container.register('loader', self);

    return automate<U, JobStepDispatch | JobStepRun | JobStepJob>(workflow, runnerMiddleware(container, self), { ...this, ...inputs, logger: this.logger }, 'ignore');
}