import { EventEmitter } from 'events'
import { eachAsync } from './helpers.js';
import sequencify, { Task } from './sequencify.js'

export default class Orchestrator extends EventEmitter
{
    public readonly tasks: Record<string, Task & { name: string, action?: () => void | Promise<void> }> = {};

    public add(name: string, dependencies: string[], action?: () => void | Promise<void>)
    {
        this.tasks[name] = { name, dep: dependencies, action }
    }

    public async start(...names: string[]): Promise<void>
    {
        const seq = sequencify(this.tasks, names);
        this.emit('start', names);
        try
        {
            await eachAsync(seq.sequence, async (task) =>
            {
                this.emit('task_start', { message: `starting ${task}...`, task: this.tasks[task] });

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
                this.emit('task_stop', { message: `${task} finished.` }, this.tasks[task]);
            })
            this.emit('stop');
        }
        catch (e)
        {
            this.emit('stop', e);
        }
    }
}