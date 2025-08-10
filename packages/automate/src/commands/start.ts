import { Deferred } from "@akala/core";
import { type Workflow } from "../index.js";
import type { WorkflowInstance } from "../state.js";
import type State from "../state.js";

export default async function <T>(this: State, workflow: Workflow | string, context: T, wait?: boolean)
{

    if (typeof workflow == 'string')
        workflow = this.workflows[workflow];
    let workflowInstance: WorkflowInstance = { workflow, context };
    if (wait)
        Object.defineProperty(workflowInstance, 'complete', { value: new Deferred(), writable: false, enumerable: false, configurable: false });

    this.queue.enqueue(workflowInstance)

    return workflowInstance.complete;
}
