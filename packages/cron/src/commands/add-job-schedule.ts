import { Container } from '@akala/commands'
import getTarget, { DateRequest, parseCronSyntax } from "..";
import { State } from '../state';
import wait from './wait';

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