import { type State } from '../state.js';

export default function schedule(
    this: State,
    jobName: string,
    scheduleName: string)
{
    this.schedules[scheduleName].removeJob(this.jobs[jobName]);
}
