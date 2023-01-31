import { Workflow } from './automate'
import { Deferred, Queue } from '@akala/core'
import loader from './loader';
import * as trigger from '@akala/pubsub';
import { Schedule } from '@akala/cron';

export type WorkflowInstance<T = unknown, TResult = unknown> = { workflow: Workflow, context: T, complete?: Deferred<TResult> };

export default interface State
{
    queue: Queue<WorkflowInstance>;
    workflows: { [key: string]: Workflow };
    loaders: { [key: string]: loader.container }
    triggers: { [key: string]: trigger.Container }
    schedules: { [key: string]: Schedule }
}