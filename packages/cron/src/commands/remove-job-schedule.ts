import { Container } from '@akala/commands'
import getTarget, { DateRequest, parseCronSyntax } from "..";
import { State } from '../state';
import wait from './wait';

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