import { Workflow } from './automate'
import { Queue } from '@akala/core'
import { Deferred } from '@akala/json-rpc-ws'
import loader from './loader';

export type WorkflowInstance<T = any, TResult = unknown> = { workflow: Workflow, context: T, complete?: Deferred<TResult> };

export default interface State
{
    queue: Queue<WorkflowInstance>;
    workflows: { [key: string]: Workflow };
    loaders: { [key: string]: loader.container }
}
