import { Container } from "@akala/commands";
import { Job } from "../index.js";
import { State } from "../state.js";

export default function add(this: State, name: string, container: Container<void>, cmdNameToTrigger: string)
{
    if (typeof this.jobs[name] != 'undefined')
        throw new Error(`a job with the same name (${name}) already exists`)
    this.jobs[name] = new Job((schedule, waitinfo) => { container.dispatch(cmdNameToTrigger, { schedule, waitinfo, _trigger: 'cron' }) });
}