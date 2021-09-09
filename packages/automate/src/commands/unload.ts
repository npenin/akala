import State, { JobCommand } from '../state';
import { Container } from '@akala/commands';

export default async function (this: State, container: Container<any>, name: string)
{
    const workflow = this.workflows[name];
    if (typeof workflow == 'undefined')
        throw new Error('no such workflow exists');
    delete this.workflows[name];
    const command = container.resolve<JobCommand>('process-' + name)
    container.unregister('process-' + name);

    if (workflow.on)
    {
        Object.entries(workflow.on).map(async ([triggerName, value]) =>
        {
            if (triggerName == 'cron')
            {
                if (typeof (value) == 'string')
                    this.schedules[value].jobs.splice(this.schedules[value].jobs.indexOf(command), 1);
                else
                {
                    const stringValue = JSON.stringify(value);
                    this.schedules[stringValue].jobs.splice(this.schedules[stringValue].jobs.indexOf(command), 1);
                }
            }
            else if (triggerName in this.triggers)
                await this.triggers[triggerName].dispatch('unsubscribe', container, value as string);
        });
    }

}