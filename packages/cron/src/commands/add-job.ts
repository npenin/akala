import { Container } from "@akala/commands";
import { DateRequest, Job, JobCommand, JobLike, parseCronSyntax } from "..";
import { Schedule, State } from "../state";

export default function add(this: State, name: string, container: Container<void>, cmdNameToTrigger: string)
{
    if (typeof this.jobs[name] != 'undefined')
        throw new Error(`a job with the same name (${name}) already exists`)
    this.jobs[name] = new Job((schedule, waitinfo) => { container.dispatch(cmdNameToTrigger, { schedule, waitinfo, _trigger: 'cron' }) });
}