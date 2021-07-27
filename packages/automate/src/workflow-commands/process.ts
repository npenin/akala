import { CliContext } from "@akala/cli";
import { Container } from "@akala/commands";
import automate, { JobStepDispatch, JobStepJob, JobStepRun, Runner, simpleRunner, Workflow, interpolate, JobStepUse } from "../automate";
import path from 'path'
import use from './use';

export default async function process<U extends object>(this: CliContext<{ file: string }>, workflow: Workflow, inputs: unknown, self: Container<CliContext>)
{
    const context = this;
    const container = new Container<object>(new Date().toISOString(), this);
    container.register('loader', self)
    const runner = Object.assign({
        async dispatch(cmd, step)
        {
            return await container.dispatch(cmd, { _trigger: 'automate', ...interpolate.buildObject(step.with)(this), param: [] });
        },
        async job(cmd, step)
        {
            return automate((await self.dispatch('load', cmd)), runner, interpolate.buildObject(step.with)(this), 'ignore');
        },
        async uses(cmd, step)
        {
            await use.call(context, container, step.with?.name, path.join(path.dirname(context.options.file), cmd));
        }
    } as Runner<JobStepDispatch | JobStepJob | JobStepUse>, simpleRunner);
    return automate<U, JobStepDispatch | JobStepRun | JobStepJob>(workflow, runner, Object.assign(this, inputs), 'ignore');
}