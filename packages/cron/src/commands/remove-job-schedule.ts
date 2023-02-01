import { State } from '../state.js';

export default function schedule(
    this: State,
    jobName: string,
    scheduleName: string)
{
    const indexOfJob = this.schedules[scheduleName].jobs.indexOf(this.jobs[jobName]);
    if (indexOfJob >= 0)
        this.schedules[scheduleName].jobs.splice(indexOfJob);
    else
        throw new Error(`job ${jobName} is not scheduled with ${scheduleName}`);
}