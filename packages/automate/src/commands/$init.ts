import { Queue } from "@akala/server";
import State, { WorkflowInstance } from "../state.js";
import { getRandomName, sidecar, Container as pmContainer } from '@akala/pm'
import workflow from "../workflow.js";

export default async function init(this: State, pm: pmContainer, persistTo?: string)
{
    const queueProcessor = (msg: WorkflowInstance<object>, next: (processed: boolean) => void) =>
    {
        const name = msg.workflow.name || getRandomName();
        pm.dispatch('start', '@akala/automate/workflow', { options: { new: true, name: name, wait: true }, args: ['local'], argv: [], currentWorkingDirectory: process.cwd(), logger: null }).then(async () =>
        {
            const workflow: workflow.container = (await sidecar()[name]);
            await workflow.dispatch('set-config', msg.context);
            const result = await workflow.dispatch('process', msg.workflow, msg.context);
            if (msg.complete)
                msg.complete.resolve(result);
        })
            .then(async (result) =>
            {
                await pm.dispatch('stop', name);
                next(true);
                if (msg.complete)
                    msg.complete.resolve(result);
            }, async (err) =>
            {
                await pm.dispatch('stop', name);
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
    this.loaders = {};
    this.schedules = {};
    this.triggers = {};
}