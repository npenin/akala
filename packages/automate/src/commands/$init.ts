import { Queue } from "@akala/server";
import automate, { JobStepDispatch, JobStepRun, Runner, simpleRunner } from "../automate";
import State, { WorkflowInstance } from "../state";
import { Container } from "@akala/commands";
import { getRandomName, sidecar } from '@akala/pm'
import workflow from "../workflow";

export default async function init(this: State, persistTo?: string)
{
    const pm = await sidecar().pm;

    const queueProcessor = (msg: WorkflowInstance, next: (processed: boolean) => void) =>
    {
        const name = getRandomName();
        pm.dispatch('start', require.resolve('../../workflow.json'), { options: { new: true, name: name, wait: true } }).then(async () =>
        {
            const workflow: workflow.container = (await sidecar()[name]);
            await workflow.dispatch('set-config', msg.context);
            const result = await workflow.dispatch('process', msg.workflow);
            if (msg.complete)
                msg.complete.resolve(result);
        })
            .then((result) =>
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
    };

    if (persistTo)
        this.queue = new Queue<WorkflowInstance>(queueProcessor, persistTo);
    else
        this.queue = new Queue<WorkflowInstance>(queueProcessor, []);

    this.workflows = {};
}