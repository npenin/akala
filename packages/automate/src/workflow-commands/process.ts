import { Container } from "@akala/commands";
import automate, { JobStepDispatch, JobStepRun, Runner, simpleRunner, Workflow } from "../automate";

export default async function process<U extends object>(workflow: Workflow)
{
    const container = new Container<object>(new Date().toISOString(), {});
    return automate<U, JobStepDispatch | JobStepRun>(workflow.jobs, Object.assign({
        dispatch(cmd, step)
        {
            return container.dispatch(cmd, { _trigger: 'automate', ...step.with, param: [] });
        }
    } as Runner<JobStepDispatch>, simpleRunner));

}