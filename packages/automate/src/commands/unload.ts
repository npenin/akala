import State from '../state';
import { Container } from '@akala/commands';
import { JobCommand } from '@akala/cron';

export default async function (this: State, container: Container<unknown>, name: string)
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
                var stringValue: string;

                if (typeof (value) == 'string')
                    stringValue = value;
                else
                    stringValue = JSON.stringify(value);
                this.schedules[stringValue].jobs.splice(this.schedules[stringValue].jobs.indexOf(command), 1);

                if (this.schedules[stringValue].jobs.length == 0)
                    this.schedules[stringValue].stop();
            }
            else if (triggerName in this.triggers)
                await this.triggers[triggerName].dispatch('unsubscribe', container, value as string);
        });
    }

}