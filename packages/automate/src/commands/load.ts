import fs from 'fs/promises'
import State from '../state';
import path from 'path'
import { TriggerMap, Workflow } from '../automate';
import { Container } from '@akala/commands';
import { JobCommand, parseCronSyntax, Schedule } from '@akala/cron';
import { Deferred, eachAsync } from '@akala/core';

export default async function (this: State, container: Container<unknown>, name: string, workflowFile: string)
{
    let workflow: Workflow;
    // console.log(arguments);
    var extension = path.extname(workflowFile);
    switch (extension)
    {
        case '.json':
            {
                const serializedWorkflow = await fs.readFile(workflowFile, 'utf8');
                workflow = JSON.parse(serializedWorkflow);
            }
            break;
        default:
            if (!this.loaders[extension])
                throw new Error(path.extname(workflowFile) + 'is not a supported file extension for a workflow load');
            workflow = await this.loaders[extension].dispatch('load', workflowFile);
    }
    if (this.workflows[name])
    {
        await container.dispatch('unload', name);
    }
    this.workflows[name] = workflow;

    const command = new JobCommand((trigger) =>
    {
        const deferred = new Deferred();
        this.queue.enqueue({ workflow, complete: deferred, context: { trigger } });
        return deferred;
    }, 'process-' + name);

    container.register(command);

    console.log(workflow.on);
    if (workflow.on)
    {
        await eachAsync(workflow.on, async (value: TriggerMap[typeof triggerName], triggerName: keyof TriggerMap) =>
        {
            // console.log(arguments);

            if (triggerName == 'cron')
            {
                if (typeof (value) == 'string')
                {
                    this.schedules[value] = this.schedules[value] || new Schedule(value, parseCronSyntax(value));
                    this.schedules[value].jobs.push(command);
                    this.schedules[value].start();
                }
                else
                {
                    const stringValue = JSON.stringify(value);
                    this.schedules[stringValue] = this.schedules[stringValue] || new Schedule(stringValue, [value]);
                    this.schedules[stringValue].jobs.push(command);
                    this.schedules[stringValue].start();
                }
            }
            else if (triggerName in this.triggers)
                await this.triggers[triggerName].dispatch('subscribe', container, value as string, 'process-' + name);
        }, false);
    }

}