import { Workflow } from './automate'
import { Queue } from '@akala/core'
import { Deferred } from '@akala/json-rpc-ws'
import loader from './loader';
import * as trigger from '@akala/pubsub';
import { JobLike, Schedule, WaitInfo } from '@akala/cron';
import { Metadata, SelfDefinedCommand } from '@akala/commands';

export type WorkflowInstance<T = any, TResult = unknown> = { workflow: Workflow, context: T, complete?: Deferred<TResult> };

export default interface State
{
    queue: Queue<WorkflowInstance>;
    workflows: { [key: string]: Workflow };
    loaders: { [key: string]: loader.container }
    triggers: { [key: string]: trigger.container }
    schedules: { [key: string]: Schedule }
}