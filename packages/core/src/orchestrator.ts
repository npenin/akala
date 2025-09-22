import { EventEmitter } from './events/event-emitter.js'
import type { IEvent } from './events/shared.js';
import { each as eachAsync } from './eachAsync.js';
import sequencify, { type Task } from './sequencify.js'

interface EventMap
{
    start: IEvent<[string[]], void>
    task_start: IEvent<[{ message: string, task: Task, taskName: string }], void>
    task_stop: IEvent<[{ message: string, task: Task, taskName: string }, Task], void>
    error: IEvent<[{ error: Error, task: Task }], void>
    stop: IEvent<[Error] | [], void>
}

/**
 * Orchestrates task execution with dependency management
 * @class Orchestrator
 * @extends EventEmitter
 * @fires Orchestrator#start
 * @fires Orchestrator#task_start
 * @fires Orchestrator#task_stop
 * @fires Orchestrator#error
 * @fires Orchestrator#stop
 */
export class Orchestrator extends EventEmitter<EventMap>
{
    public readonly tasks: Record<string, Task & { name: string, action?: () => void | Promise<void> }> = {};

    /**
     * Adds a task to the orchestrator
     * @param {string} name - Unique identifier for the task
     * @param {string[]} dependencies - Array of task names this task depends on
     * @param {function} [action] - Optional async function to execute for the task
     */
    public add(name: string, dependencies: string[], action?: () => void | Promise<void>)
    {
        this.tasks[name] = { name, dep: dependencies, action }
    }

    /**
     * Executes tasks in dependency order
     * @param {...string} names - Task names to execute (and their dependencies)
     * @returns {Promise<void>} Resolves when all tasks complete, rejects on critical error
     */
    public async start(...names: string[]): Promise<void>
    {
        const seq = sequencify(this.tasks, names);
        this.emit('start', names);
        try
        {
            await eachAsync(seq.sequence, async (task) =>
            {
                this.emit('task_start', { message: `starting ${task}...`, task: this.tasks[task], taskName: task });

                if (this.tasks[task].action)
                    try
                    {
                        await this.tasks[task].action();
                    }
                    catch (e)
                    {
                        this.emit('error', { error: e, task: this.tasks[task] });
                        throw e;
                    }
                this.emit('task_stop', { message: `${task} finished.`, task: this.tasks[task], taskName: task }, this.tasks[task]);
            })
            this.emit('stop');
        }
        catch (e)
        {
            this.emit('stop', e);
        }
    }
}
