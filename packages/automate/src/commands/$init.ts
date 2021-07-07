import { Queue } from "@akala/server";
import automate, { JobStepDispatch, JobStepRun, Runner, simpleRunner } from "../automate";
import State, { WorkflowInstance } from "../state";
import { Container } from "@akala/commands";

export function queueProcessor<T, U extends object>(msg: WorkflowInstance<T, U>, next: (processed: boolean) => void) 
{
    const container = new Container<object>(new Date().toISOString(), {});
    automate<U, JobStepDispatch | JobStepRun>(msg.workflow.jobs, Object.assign({
        dispatch(cmd, step)
        {
            return container.dispatch(cmd, { _trigger: 'automate', ...step.with, param: [] });
        }
    } as Runner<JobStepDispatch>, simpleRunner)).then((result) =>
    {
        next(true);
        if (msg.complete)
            msg.complete.resolve(result);
    }, (err) =>
    {
        console.error(err);
        next(true);
        if (msg.complete)
            msg.complete.reject(err);
    });
}

export default async function init(this: State, persistTo?: string)
{
    if (persistTo)
        this.queue = new Queue<WorkflowInstance>(queueProcessor, persistTo);
    else
        this.queue = new Queue<WorkflowInstance>(queueProcessor, []);
}