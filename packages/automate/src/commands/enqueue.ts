import { Deferred } from "@akala/json-rpc-ws";
import { Workflow } from "../automate";
import State, { WorkflowInstance } from "../state";

export default async function <T>(this: State, workflow: Workflow, context: T, wait?: boolean)
{
    var workflowInstance: WorkflowInstance = { workflow, context };
    if (wait)
        Object.defineProperty(workflowInstance, 'complete', { value: new Deferred(), writable: false, enumerable: false, configurable: false });

    this.queue.enqueue(workflowInstance)

    return workflowInstance.complete;
}