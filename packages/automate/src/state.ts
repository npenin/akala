import { Workflow } from './automate'
import { Queue } from '@akala/core'
import { Deferred } from '@akala/json-rpc-ws'

export type WorkflowInstance<T = any, TResult = unknown> = { workflow: Workflow, context: T, complete?: Deferred<TResult> };

export default interface State
{
    queue: Queue<WorkflowInstance>
}