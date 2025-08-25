import { type State } from '../state.js';

export default function schedule(
    this: State,
    jobName: string,
    scheduleName: string)
{
    this.schedules[scheduleName].addJob(this.jobs[jobName]);
}
