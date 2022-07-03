import { State } from '../state';

export default function schedule(
    this: State,
    jobName: string,
    scheduleName: string)
{
    if (this.schedules[scheduleName].jobs.indexOf(this.jobs[jobName]) == -1)
        this.schedules[scheduleName].jobs.push(this.jobs[jobName]);
    else
        throw new Error(`job ${jobName} is already scheduled with ${scheduleName}`);
}